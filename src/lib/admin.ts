import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/../lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

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

    // When an active org is selected, admin is scoped to that org only.
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
        }
        return activeOrgIsAdmin;
    }

    const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { role: true },
    });

    if (dbUser?.role === 'ADMIN') return true;
    if (!dbUser) return false;

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

        await prisma.user.update({
            where: { clerkId: userId },
            data: { role: 'ADMIN' },
        });
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
        include: {
            partnerMemberships: {
                include: { partner: true },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
    if (!user) return null;

    const memberships = user.partnerMemberships ?? [];
    const activeMembership = orgId
        ? memberships.find(membership => membership.partner.clerkOrganizationId === orgId)
        : memberships[0];

    return {
        ...user,
        partner: activeMembership?.partner ?? null,
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
