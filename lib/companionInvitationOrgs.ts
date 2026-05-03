import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '~/lib/prisma';
import {
    addMembershipForOrganization,
    resolveExistingPartnerClerkUserId,
} from '~/lib/partnerInvitationMembership';

type PendingBundleRow = {
    id: string;
    normalizedInviteeEmail: string;
    primaryClerkOrganizationId: string;
    companionClerkOrganizationIds: string[];
};

export type CompanionBundleStatus = {
    id: string;
    primaryOrganizationId: string;
    primaryOrganizationName: string;
    remainingCompanionOrganizationIds: string[];
    remainingCompanionOrganizationNames: string[];
    attemptCount: number;
    lastAttemptAt: string | null;
    lastError: string | null;
    status: 'awaiting_acceptance' | 'needs_attention';
};

/**
 * Persist companion org Clerk ids keyed by invitee email + primary org (one Clerk email per bundle).
 */
export async function upsertInvitationCompanionOrganizations(
    normalizedInviteeEmail: string,
    primaryClerkOrganizationId: string,
    companionClerkOrganizationIds: string[]
): Promise<void> {
    await prisma.invitationCompanionOrganizations.deleteMany({
        where: {
            normalizedInviteeEmail,
            primaryClerkOrganizationId,
        },
    });
    if (companionClerkOrganizationIds.length === 0) return;

    await prisma.invitationCompanionOrganizations.create({
        data: {
            normalizedInviteeEmail,
            primaryClerkOrganizationId,
            companionClerkOrganizationIds,
        },
    });
}

async function tryApplyCompanionBundle(opts: {
    pending: PendingBundleRow;
    clerkUserId: string;
    invitationEmailRaw: string;
    throwOnFailure: boolean;
}): Promise<{ ok: true } | { ok: false; failedCount: number; errorPreview: string }> {
    const { pending, clerkUserId, invitationEmailRaw, throwOnFailure } = opts;
    const client = await clerkClient();
    const emailForPrep =
        invitationEmailRaw?.trim()?.length > 0
            ? invitationEmailRaw.trim()
            : pending.normalizedInviteeEmail;

    const failedCompanions: string[] = [];
    const failureMessages: string[] = [];

    for (const companionOrgId of pending.companionClerkOrganizationIds) {
        const result = await addMembershipForOrganization({
            client,
            targetOrganizationId: companionOrgId,
            clerkUserId,
            emailRaw: emailForPrep,
        });
        if (!result.ok) {
            failedCompanions.push(companionOrgId);
            failureMessages.push(result.error);
        }
    }

    if (failedCompanions.length === 0) {
        await prisma.invitationCompanionOrganizations
            .delete({ where: { id: pending.id } })
            .catch(() => {
                /* idempotent / concurrent delivery */
            });
        return { ok: true };
    }

    const errorPreview = failureMessages.slice(0, 3).join(' ');
    await prisma.invitationCompanionOrganizations.update({
        where: { id: pending.id },
        data: {
            companionClerkOrganizationIds: failedCompanions,
            attemptCount: { increment: 1 },
            lastAttemptAt: new Date(),
            lastError: errorPreview || 'Some companion organizations could not be applied.',
        },
    });

    if (throwOnFailure) {
        throw new Error(
            `Failed to apply ${failedCompanions.length} bundled organization(s): ${errorPreview}`
        );
    }

    return { ok: false, failedCount: failedCompanions.length, errorPreview };
}

/**
 * Return unresolved bundled-invitation status rows for a specific invitee email.
 */
export async function listInvitationCompanionStatuses(
    normalizedInviteeEmail: string
): Promise<CompanionBundleStatus[]> {
    const rows = await prisma.invitationCompanionOrganizations.findMany({
        where: { normalizedInviteeEmail },
        orderBy: { createdAt: 'desc' },
    });
    if (rows.length === 0) return [];

    const orgIds = new Set<string>();
    for (const row of rows) {
        orgIds.add(row.primaryClerkOrganizationId);
        for (const companionId of row.companionClerkOrganizationIds) orgIds.add(companionId);
    }
    const partners = await prisma.partner.findMany({
        where: { clerkOrganizationId: { in: Array.from(orgIds) } },
        select: { clerkOrganizationId: true, organizationName: true },
    });
    const orgNameById = new Map(partners.map(p => [p.clerkOrganizationId, p.organizationName]));

    return rows.map(row => ({
        id: row.id,
        primaryOrganizationId: row.primaryClerkOrganizationId,
        primaryOrganizationName:
            orgNameById.get(row.primaryClerkOrganizationId) ?? row.primaryClerkOrganizationId,
        remainingCompanionOrganizationIds: row.companionClerkOrganizationIds,
        remainingCompanionOrganizationNames: row.companionClerkOrganizationIds.map(
            id => orgNameById.get(id) ?? id
        ),
        attemptCount: row.attemptCount,
        lastAttemptAt: row.lastAttemptAt ? row.lastAttemptAt.toISOString() : null,
        lastError: row.lastError,
        status: row.attemptCount > 0 ? 'needs_attention' : 'awaiting_acceptance',
    }));
}

/**
 * Manually replay unresolved bundled invites for an email from the admin UI.
 */
export async function retryInvitationCompanionStatuses(normalizedInviteeEmail: string): Promise<{
    resolvedCount: number;
    stillFailingCount: number;
    waitingForAcceptanceCount: number;
    errors: string[];
}> {
    const rows = await prisma.invitationCompanionOrganizations.findMany({
        where: { normalizedInviteeEmail },
        select: {
            id: true,
            normalizedInviteeEmail: true,
            primaryClerkOrganizationId: true,
            companionClerkOrganizationIds: true,
        },
    });
    if (rows.length === 0) {
        return {
            resolvedCount: 0,
            stillFailingCount: 0,
            waitingForAcceptanceCount: 0,
            errors: [],
        };
    }

    const client = await clerkClient();
    const clerkUserId = await resolveExistingPartnerClerkUserId(client, normalizedInviteeEmail);
    if (!clerkUserId) {
        return {
            resolvedCount: 0,
            stillFailingCount: 0,
            waitingForAcceptanceCount: rows.length,
            errors: [
                'User account is not available yet. Ask them to accept the invitation email first.',
            ],
        };
    }

    let resolvedCount = 0;
    let stillFailingCount = 0;
    const errors: string[] = [];

    for (const pending of rows) {
        const result = await tryApplyCompanionBundle({
            pending,
            clerkUserId,
            invitationEmailRaw: normalizedInviteeEmail,
            throwOnFailure: false,
        });
        if (result.ok) {
            resolvedCount += 1;
        } else {
            stillFailingCount += 1;
            if (result.errorPreview) errors.push(result.errorPreview);
        }
    }

    return {
        resolvedCount,
        stillFailingCount,
        waitingForAcceptanceCount: 0,
        errors: errors.slice(0, 3),
    };
}

/**
 * Called from Clerk `organizationInvitation.accepted` — add memberships for bundled orgs, then drop row.
 */
export async function applyInvitationCompanionOrganizations(
    clerkUserId: string,
    invitedEmailNormalized: string,
    acceptedPrimaryOrganizationId: string,
    invitationEmailRaw: string
): Promise<void> {
    const pending = await prisma.invitationCompanionOrganizations.findUnique({
        where: {
            normalizedInviteeEmail_primaryClerkOrganizationId: {
                normalizedInviteeEmail: invitedEmailNormalized,
                primaryClerkOrganizationId: acceptedPrimaryOrganizationId,
            },
        },
    });
    if (!pending || pending.companionClerkOrganizationIds.length === 0) return;

    await tryApplyCompanionBundle({
        pending: {
            id: pending.id,
            normalizedInviteeEmail: pending.normalizedInviteeEmail,
            primaryClerkOrganizationId: pending.primaryClerkOrganizationId,
            companionClerkOrganizationIds: pending.companionClerkOrganizationIds,
        },
        clerkUserId,
        invitationEmailRaw,
        throwOnFailure: true,
    });
}
