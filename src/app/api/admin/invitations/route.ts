import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { Prisma } from '@prisma/client';
import { prisma } from '~/lib/prisma';
import { upsertInvitationCompanionOrganizations } from '~/lib/companionInvitationOrgs';
import {
    addMembershipForOrganization,
    createInvitationForOrganization,
    extractClerkErrorMessage,
    resolveExistingPartnerClerkUserId,
} from '~/lib/partnerInvitationMembership';
import { CLERK_SIGN_IN_PATH } from '@/lib/clerkAuthPaths';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const body = await req.json();
        const { email, name, organizationId, organizationName, organizationIds } = body as {
            email?: string;
            name?: string;
            organizationId?: string;
            organizationName?: string;
            organizationIds?: string[];
        };
        const trimmedName = typeof name === 'string' ? name.trim() : '';

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const client = await clerkClient();
        const inviter = await client.users.getUser(userId);
        const inviterEmails = new Set(
            inviter.emailAddresses.map(e => e.emailAddress.trim().toLowerCase())
        );
        if (inviterEmails.has(email.trim().toLowerCase())) {
            return NextResponse.json(
                {
                    error: 'This email matches your Clerk account. Enter the address for the person you are inviting.',
                },
                { status: 400 }
            );
        }

        if (organizationName && !organizationId && !organizationIds?.length) {
            return NextResponse.json(
                {
                    error: 'Creating organizations from invites is disabled. Create the partner first with a Household Id 18.',
                },
                { status: 400 }
            );
        }

        const rawIds =
            Array.isArray(organizationIds) && organizationIds.length > 0
                ? organizationIds
                : organizationId
                  ? [organizationId]
                  : [];

        const requestedOrgIds = [
            ...new Set(rawIds.map(id => (typeof id === 'string' ? id.trim() : '')).filter(Boolean)),
        ];

        if (requestedOrgIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one organization ID is required' },
                { status: 400 }
            );
        }

        const requestedPartners = await prisma.partner.findMany({
            where: { clerkOrganizationId: { in: requestedOrgIds } },
            select: { clerkOrganizationId: true, organizationName: true },
        });
        const requestedNameByOrgId = new Map(
            requestedPartners.map(p => [p.clerkOrganizationId, p.organizationName] as const)
        );
        const requestedIncludesDistributor = requestedOrgIds.some(id =>
            isDistributorPartnerOrgName(requestedNameByOrgId.get(id))
        );
        const uniqueOrgIds = requestedIncludesDistributor
            ? (
                  await prisma.partner.findMany({
                      select: { clerkOrganizationId: true },
                      orderBy: { organizationName: 'asc' },
                  })
              ).map(p => p.clerkOrganizationId)
            : requestedOrgIds;

        const normalizedEmailLower = email.trim().toLowerCase();
        const existingClerkUserId = await resolveExistingPartnerClerkUserId(
            client,
            normalizedEmailLower
        );

        const invitationRedirectUrl = new URL(CLERK_SIGN_IN_PATH, req.nextUrl.origin).toString();

        const invitations: {
            id: string;
            emailAddress: string;
            organizationId: string;
            status: string;
            bundledOrganizationIds?: string[];
        }[] = [];
        const membershipsAdded: {
            organizationId: string;
            skippedAlreadyMember?: boolean;
        }[] = [];

        const errors: { organizationId: string; error: string }[] = [];
        let companionBundleWarning: string | undefined;

        if (existingClerkUserId) {
            const roleOverride = requestedIncludesDistributor ? 'org:admin' : undefined;
            for (const targetOrganizationId of uniqueOrgIds) {
                const m = await addMembershipForOrganization({
                    client,
                    targetOrganizationId,
                    clerkUserId: existingClerkUserId,
                    emailRaw: email,
                    roleOverride,
                });
                if (m.ok) {
                    membershipsAdded.push({
                        organizationId: m.organizationId,
                        skippedAlreadyMember: m.skippedAlreadyMember,
                    });
                } else {
                    errors.push({ organizationId: targetOrganizationId, error: m.error });
                }
            }
        } else {
            /** Preserve the order from the dashboard (checkbox order → first listed org receives the Clerk email). */
            const bundleOrgIds = uniqueOrgIds;
            const distributorOrgId = requestedIncludesDistributor
                ? requestedPartners.find(p => isDistributorPartnerOrgName(p.organizationName))
                      ?.clerkOrganizationId
                : undefined;
            const primaryId = distributorOrgId ?? bundleOrgIds[0]!;
            const companionIds = bundleOrgIds.filter(id => id !== primaryId);

            const result = await createInvitationForOrganization({
                client,
                inviterUserId: userId,
                emailRaw: email,
                trimmedName,
                targetOrganizationId: primaryId,
                invitationRedirectUrl,
            });

            if (!result.ok) {
                errors.push({ organizationId: primaryId, error: result.error });
                for (const cid of companionIds) {
                    errors.push({
                        organizationId: cid,
                        error: 'Not included until the invitation for the primary organization succeeds.',
                    });
                }
            } else {
                let bundleCompanionWriteFailed = false;
                if (companionIds.length > 0) {
                    try {
                        await upsertInvitationCompanionOrganizations(
                            normalizedEmailLower,
                            primaryId,
                            companionIds
                        );
                    } catch {
                        bundleCompanionWriteFailed = true;
                        companionBundleWarning =
                            'Invitation email was sent for the primary organization only. Extra organizations could not be bundled—try inviting them separately.';
                    }
                }

                invitations.push({
                    id: result.invitationId,
                    emailAddress: email.trim(),
                    organizationId: result.organizationId,
                    status: 'pending',
                    bundledOrganizationIds:
                        companionIds.length > 0 && !bundleCompanionWriteFailed
                            ? bundleOrgIds
                            : undefined,
                });
            }
        }

        const successCount = invitations.length + membershipsAdded.length;
        if (successCount === 0) {
            const firstError = errors[0]?.error ?? 'Failed to create invitations';
            return NextResponse.json(
                { error: firstError, errors },
                { status: errors.some(e => e.error.includes('pending invitation')) ? 409 : 400 }
            );
        }

        const firstInvitation = invitations[0];
        const singleEmailBundleCount =
            !existingClerkUserId &&
            firstInvitation?.bundledOrganizationIds &&
            firstInvitation.bundledOrganizationIds.length > 1
                ? firstInvitation.bundledOrganizationIds.length
                : undefined;

        return NextResponse.json({
            invitations,
            membershipsAdded: membershipsAdded.length > 0 ? membershipsAdded : undefined,
            usedExistingAccount: Boolean(existingClerkUserId),
            singleInvitationEmailCoveringOrganizations: singleEmailBundleCount,
            warning: companionBundleWarning,
            errors: errors.length > 0 ? errors : undefined,
            invitation: firstInvitation,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Organization mapping conflict detected. Check Household ID mapping.' },
                { status: 409 }
            );
        }
        const clerkMsg = extractClerkErrorMessage(error);
        if (clerkMsg) {
            return NextResponse.json({ error: clerkMsg }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
    }
}
