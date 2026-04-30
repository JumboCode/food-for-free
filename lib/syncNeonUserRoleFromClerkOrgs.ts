import { clerkClient } from '@clerk/nextjs/server';
import prisma from './prisma';
import { isDistributorPartnerOrgName } from './distributorPartner';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

/**
 * Set Neon User.role based on Clerk org memberships (ADMIN when in distributor org).
 * Matches bootstrap admin-by-email behavior with {@link upsertNeonUserFromClerk}.
 */
export async function syncNeonUserRoleFromClerkOrgs(clerkUserId: string): Promise<void> {
    const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true, email: true },
    });
    if (!user) return;

    const client = await clerkClient();
    const { data } = await client.users.getOrganizationMembershipList({
        userId: clerkUserId,
        limit: 100,
    });

    let inDistributorOrg = false;
    for (const membership of data) {
        const orgName = membership.organization?.name ?? '';
        if (isDistributorPartnerOrgName(orgName)) {
            inDistributorOrg = true;
            break;
        }
    }

    const bootstrapAdmin =
        ADMIN_EMAIL && user.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase();

    await prisma.user.update({
        where: { clerkId: clerkUserId },
        data: { role: inDistributorOrg || bootstrapAdmin ? 'ADMIN' : 'PARTNER' },
    });
}
