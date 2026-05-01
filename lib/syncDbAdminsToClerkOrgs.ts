import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '~/lib/prisma';

type ClerkRole = 'org:admin' | 'org:member';

/**
 * Ensure every Neon DB ADMIN user is a member of the given Clerk organization.
 * Returns the number of memberships created.
 */
export async function ensureDbAdminsInOrganization(
    organizationId: string,
    role: ClerkRole = 'org:member'
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
    const existing = new Set(
        memberships.data
            .map(membership => membership.publicUserData?.userId)
            .filter((id): id is string => Boolean(id))
    );

    let created = 0;
    for (const admin of admins) {
        if (existing.has(admin.clerkId)) continue;
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
