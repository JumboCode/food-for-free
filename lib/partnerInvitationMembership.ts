import { clerkClient } from '@clerk/nextjs/server';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '~/lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

export type ClerkApiClient = Awaited<ReturnType<typeof clerkClient>>;

export function extractClerkErrorMessage(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const obj = error as {
        errors?: Array<{ message?: unknown; longMessage?: unknown; code?: unknown }>;
    };
    if (Array.isArray(obj.errors) && obj.errors.length > 0) {
        const first = obj.errors[0];
        const longMessage = typeof first.longMessage === 'string' ? first.longMessage.trim() : '';
        if (longMessage) return longMessage;
        const message = typeof first.message === 'string' ? first.message.trim() : '';
        if (message) return message;
        const code = typeof first.code === 'string' ? first.code.trim() : '';
        if (code) return `Clerk error: ${code}`;
    }
    return null;
}

export async function resolveExistingPartnerClerkUserId(
    client: ClerkApiClient,
    normalizedEmail: string
): Promise<string | null> {
    const userIdIfVerifiedInviteEmail = (u: {
        emailAddresses: Array<{
            emailAddress: string;
            verification?: { status?: string } | null;
        }>;
    }): boolean =>
        u.emailAddresses.some(
            ea =>
                ea.emailAddress.trim().toLowerCase() === normalizedEmail &&
                ea.verification?.status === 'verified'
        );

    try {
        const listed = await client.users.getUserList({
            emailAddress: [normalizedEmail],
            limit: 25,
        });
        const matchingUsers = listed.data.filter(u =>
            u.emailAddresses.some(ea => ea.emailAddress.trim().toLowerCase() === normalizedEmail)
        );
        if (matchingUsers.length === 1) {
            const u = matchingUsers[0];
            if (userIdIfVerifiedInviteEmail(u)) return u.id;
        }

        const dbUser = await prisma.user.findFirst({
            where: {
                email: { equals: normalizedEmail, mode: 'insensitive' },
                role: { not: Role.ADMIN },
            },
            select: { clerkId: true },
        });
        const mapped = dbUser?.clerkId?.trim();
        if (!mapped) return null;

        const u = await client.users.getUser(mapped);
        if (!userIdIfVerifiedInviteEmail(u)) return null;
        return u.id;
    } catch {
        return null;
    }
}

export type PrepareInvite =
    | { ok: false; error: string }
    | {
          ok: true;
          normalizedEmail: string;
          inviteRole: 'org:admin' | 'org:member';
      };

export async function preparePartnerInviteForOrganization(
    client: ClerkApiClient,
    targetOrganizationId: string,
    emailRaw: string
): Promise<PrepareInvite> {
    const normalizedEmail = emailRaw.trim().toLowerCase();

    try {
        const org = await client.organizations.getOrganization({
            organizationId: targetOrganizationId,
        });
        const inviteRole = isDistributorPartnerOrgName(org.name) ? 'org:admin' : 'org:member';

        if (!isDistributorPartnerOrgName(org.name)) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    email: { equals: normalizedEmail, mode: 'insensitive' },
                },
                select: { role: true },
            });
            if (existingUser?.role === Role.ADMIN) {
                return {
                    ok: false,
                    error: 'This email belongs to a Food For Free administrator. Partner invitations are sent to partner accounts only.',
                };
            }
        }
        const metadataHouseholdId18 =
            typeof org.publicMetadata?.householdId18 === 'string'
                ? org.publicMetadata.householdId18.trim()
                : '';
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: org.id },
            select: { householdId18: true },
        });
        const householdId18 = metadataHouseholdId18 || partner?.householdId18?.trim() || '';

        if (!householdId18) {
            return { ok: false, error: 'This organization is missing a Household Id 18.' };
        }

        if (!metadataHouseholdId18) {
            try {
                await client.organizations.updateOrganizationMetadata(org.id, {
                    publicMetadata: { ...org.publicMetadata, householdId18 },
                });
            } catch {
                // Non-blocking metadata backfill
            }
        }

        const partnerUpdate = await prisma.partner.updateMany({
            where: { clerkOrganizationId: org.id },
            data: { organizationName: org.name, householdId18 },
        });
        if (partnerUpdate.count === 0) {
            return {
                ok: false,
                error: 'This organization is not mapped in the database yet. Create it from Manage organizations first.',
            };
        }

        return {
            ok: true,
            normalizedEmail,
            inviteRole,
        };
    } catch {
        return { ok: false, error: 'Organization not found in Clerk.' };
    }
}

export async function addMembershipForOrganization(opts: {
    client: ClerkApiClient;
    targetOrganizationId: string;
    clerkUserId: string;
    emailRaw: string;
}): Promise<
    | { ok: true; organizationId: string; skippedAlreadyMember?: boolean }
    | { ok: false; error: string }
> {
    const { client, targetOrganizationId, clerkUserId, emailRaw } = opts;

    const prep = await preparePartnerInviteForOrganization(client, targetOrganizationId, emailRaw);
    if (!prep.ok) {
        return { ok: false, error: prep.error };
    }

    try {
        const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId: targetOrganizationId,
            limit: 500,
        });
        const alreadyMember = memberships.data.some(m => m.publicUserData?.userId === clerkUserId);
        if (alreadyMember) {
            return {
                ok: true,
                organizationId: targetOrganizationId,
                skippedAlreadyMember: true,
            };
        }

        await client.organizations.createOrganizationMembership({
            organizationId: targetOrganizationId,
            userId: clerkUserId,
            role: prep.inviteRole,
        });

        return { ok: true, organizationId: targetOrganizationId };
    } catch (error) {
        const clerkMsg = extractClerkErrorMessage(error);
        const raw = clerkMsg ?? (error instanceof Error ? error.message : '');
        const low = raw.toLowerCase();
        if (low.includes('already') || low.includes('duplicate') || low.includes('member')) {
            return {
                ok: true,
                organizationId: targetOrganizationId,
                skippedAlreadyMember: true,
            };
        }

        return {
            ok: false,
            error: clerkMsg ?? 'Failed to add this user to the organization.',
        };
    }
}

export async function createInvitationForOrganization(opts: {
    client: ClerkApiClient;
    inviterUserId: string;
    emailRaw: string;
    trimmedName: string;
    targetOrganizationId: string;
    invitationRedirectUrl: string;
}): Promise<
    { ok: true; invitationId: string; organizationId: string } | { ok: false; error: string }
> {
    const {
        client,
        inviterUserId,
        emailRaw,
        trimmedName,
        targetOrganizationId,
        invitationRedirectUrl,
    } = opts;

    try {
        const prep = await preparePartnerInviteForOrganization(
            client,
            targetOrganizationId,
            emailRaw
        );
        if (!prep.ok) {
            return { ok: false, error: prep.error };
        }

        const existingInvitations = await client.organizations.getOrganizationInvitationList({
            organizationId: targetOrganizationId,
            status: ['pending'],
            limit: 100,
        });
        const duplicatePendingInvite = existingInvitations.data.some(
            invitation => invitation.emailAddress.trim().toLowerCase() === prep.normalizedEmail
        );
        if (duplicatePendingInvite) {
            return {
                ok: false,
                error: 'A pending invitation already exists for this email in this organization.',
            };
        }

        const invitation = await client.organizations.createOrganizationInvitation({
            organizationId: targetOrganizationId,
            emailAddress: emailRaw.trim(),
            inviterUserId,
            role: prep.inviteRole,
            publicMetadata: trimmedName ? { inviteeName: trimmedName } : undefined,
            redirectUrl: invitationRedirectUrl,
        });

        return {
            ok: true,
            invitationId: invitation.id,
            organizationId: invitation.organizationId,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return {
                ok: false,
                error: 'Organization mapping conflict detected. Check Household ID mapping for this organization.',
            };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2011') {
            return {
                ok: false,
                error: 'Organization mapping is missing required fields in the database. Please repair the organization record first.',
            };
        }
        const clerkMsg = extractClerkErrorMessage(error);
        if (clerkMsg) {
            return { ok: false, error: clerkMsg };
        }
        if (error instanceof Error) {
            const msg = error.message.toLowerCase();
            if (
                msg.includes('already') &&
                (msg.includes('invitation') || msg.includes('invited'))
            ) {
                return {
                    ok: false,
                    error: 'A pending invitation already exists for this email in this organization.',
                };
            }
            if (msg.includes('organization') && msg.includes('not found')) {
                return { ok: false, error: 'Organization not found in Clerk.' };
            }
        }
        return { ok: false, error: 'Failed to create invitation for this organization.' };
    }
}
