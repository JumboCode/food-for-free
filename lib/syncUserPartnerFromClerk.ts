import { clerkClient } from '@clerk/nextjs/server';
import prisma from './prisma';

/**
 * Ensure user->partner memberships exist for every Clerk org membership that maps to a Partner row.
 * Call after user.created or when fixing missed webhook ordering.
 */
export async function syncUserPartnerFromClerkOrgMemberships(clerkUserId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user) return;

    const client = await clerkClient();
    const { data } = await client.users.getOrganizationMembershipList({
        userId: clerkUserId,
        limit: 100,
    });

    for (const membership of data) {
        const orgId = membership.organization.id;
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: orgId },
        });
        if (partner) {
            await prisma.userPartnerMembership.upsert({
                where: {
                    userId_partnerId: {
                        userId: user.id,
                        partnerId: partner.householdId18,
                    },
                },
                create: {
                    userId: user.id,
                    partnerId: partner.householdId18,
                },
                update: {},
            });
        }
    }
}
