import { clerkClient } from '@clerk/nextjs/server';
import prisma from './prisma';

/**
 * Set user's partnerId from the first Clerk org membership that matches a Partner row.
 * Call after user.created or when fixing missed webhook ordering.
 */
export async function syncUserPartnerFromClerkOrgMemberships(clerkUserId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { clerkId: clerkUserId } });
    if (!user || user.partnerId) return;

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
            await prisma.user.update({
                where: { clerkId: clerkUserId },
                data: { partnerId: partner.id },
            });
            return;
        }
    }
}
