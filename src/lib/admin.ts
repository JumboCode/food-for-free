import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/../lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

export type UserPartnerContext = {
    householdId18: string;
    organizationName: string;
    clerkOrganizationId: string;
};

/**
 * Load partner memberships for a user via `UserPartnerMembership`.
 */
export async function getUserPartnerContexts(clerkId: string): Promise<UserPartnerContext[]> {
    try {
        return await prisma.$queryRaw<UserPartnerContext[]>`
            SELECT
                p."householdId18",
                p."organizationName",
                p."clerkOrganizationId"
            FROM "User" u
            INNER JOIN "UserPartnerMembership" upm ON upm."userId" = u."id"
            INNER JOIN "Partner" p ON p."householdId18" = upm."partnerId"
            WHERE u."clerkId" = ${clerkId}
            ORDER BY upm."createdAt" ASC
        `;
    } catch {
        return [];
    }
}

/**
 * Check if the current user is an admin.
 * - In middleware, pass the userId from the `auth` argument.
 * - In other server contexts, call without args to let Clerk's `auth()` resolve it.
 */
export async function isAdmin(userIdOverride?: string | null): Promise<boolean> {
    const authState = await auth();
    const userId = userIdOverride ?? authState.userId;
    const activeOrgId = authState.orgId;
    if (!userId) return false;

    // If the active org is the internal Food For Free org, promote immediately.
    // Otherwise, do not early-return false: admins should remain admin even while
    // viewing another organization.
    if (activeOrgId) {
        const activePartner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: activeOrgId },
            select: { organizationName: true },
        });
        const activeOrgIsAdmin = isDistributorPartnerOrgName(activePartner?.organizationName);
        if (activeOrgIsAdmin) {
            await prisma.user.updateMany({
                where: { clerkId: userId },
                data: { role: 'ADMIN' },
            });
            return true;
        }
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });

    if (dbUser?.role === 'ADMIN') return true;

    // Webhooks can lag right after invitation acceptance. If Clerk already shows this
    // user in the Food For Free org, promote immediately and let future checks stay fast.
    try {
        const client = await clerkClient();
        const memberships = await client.users.getOrganizationMembershipList({
            userId,
            limit: 100,
        });
        const orgIds = memberships.data.map(membership => membership.organization.id);
        if (orgIds.length === 0) return false;

        const partners = await prisma.partner.findMany({
            where: { clerkOrganizationId: { in: orgIds } },
            select: { organizationName: true },
        });
        const shouldBeAdmin = partners.some(partner =>
            isDistributorPartnerOrgName(partner.organizationName)
        );
        if (!shouldBeAdmin) return false;

        if (dbUser) {
            await prisma.user.update({
                where: { clerkId: userId },
                data: { role: 'ADMIN' },
            });
        }
        return true;
    } catch (error) {
        console.error('[isAdmin] fallback membership check failed', error);
        return false;
    }
}

/**
 * Get the current user's database record
 */
export async function getCurrentUser() {
    const { userId, orgId } = await auth();
    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: {
            id: true,
            clerkId: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
        },
    });
    if (!user) return null;

    const memberships = await getUserPartnerContexts(userId);
    const activeMembership = orgId
        ? memberships.find(membership => membership.clerkOrganizationId === orgId)
        : memberships[0];

    return {
        ...user,
        partner: activeMembership ?? null,
    };
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
    const admin = await isAdmin();
    if (!admin) {
        throw new Error('Unauthorized: Admin access required');
    }
}
