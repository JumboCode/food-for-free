import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '~/lib/prisma';

type ClerkRole = 'org:admin' | 'org:member';

/**
 * Ensure every Neon DB ADMIN user is a member of the given Clerk organization.
 * Returns the number of memberships created.
 */
export async function ensureDbAdminsInOrganization(
    organizationId: string,
    role: ClerkRole = 'org:admin'
): Promise<number> {
    const [client, admins] = await Promise.all([
        clerkClient(),
        prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { clerkId: true },
        }),
    ]);

    if (admins.length === 0) return 0;

    const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId,
        limit: 500,
    });
    const membershipByUserId = new Map<string, string | null>();
    for (const membership of memberships.data) {
        const memberUserId = membership.publicUserData?.userId;
        if (!memberUserId) continue;
        membershipByUserId.set(memberUserId, membership.role ?? null);
    }

    let created = 0;
    for (const admin of admins) {
        const existingRole = membershipByUserId.get(admin.clerkId);
        if (existingRole) {
            if (existingRole !== role) {
                try {
                    await client.organizations.updateOrganizationMembership({
                        organizationId,
                        userId: admin.clerkId,
                        role,
                    });
                } catch {
                    // Non-blocking best effort.
                }
            }
            continue;
        }
        try {
            await client.organizations.createOrganizationMembership({
                organizationId,
                userId: admin.clerkId,
                role,
            });
            created += 1;
        } catch {
            // Non-blocking best effort; invitation/create callers still proceed.
        }
    }
    return created;
}

/**
 * Ensure every Neon DB ADMIN user is an org member/admin across all partner orgs.
 * Returns summary counts.
 */
export async function ensureDbAdminsAcrossAllOrganizations(
    role: ClerkRole = 'org:admin'
): Promise<{ organizationsProcessed: number; membershipsCreated: number }> {
    const orgIds = await prisma.partner.findMany({
        select: { clerkOrganizationId: true },
    });
    let membershipsCreated = 0;
    for (const org of orgIds) {
        membershipsCreated += await ensureDbAdminsInOrganization(org.clerkOrganizationId, role);
    }
    return {
        organizationsProcessed: orgIds.length,
        membershipsCreated,
    };
}
