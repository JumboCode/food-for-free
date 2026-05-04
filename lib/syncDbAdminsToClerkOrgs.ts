import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '~/lib/prisma';

type ClerkRole = 'org:admin' | 'org:member';
type SyncIssue = { organizationId: string; userId?: string; error: string };

/**
 * Ensure every Neon DB ADMIN user is a member of the given Clerk organization.
 * Returns the number of memberships created.
 */
export async function ensureDbAdminsInOrganization(
    organizationId: string,
    role: ClerkRole = 'org:admin'
): Promise<{ created: number; issues: SyncIssue[] }> {
    const [client, admins] = await Promise.all([
        clerkClient(),
        prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: { clerkId: true },
        }),
    ]);

    if (admins.length === 0) return { created: 0, issues: [] };

    const memberships = await client.organizations.getOrganizationMembershipList({
        organizationId,
        limit: 500,
    });
    const membershipByUserId = new Map<string, string | null>();
    for (const membership of memberships.data ?? []) {
        const memberUserId = membership.publicUserData?.userId;
        if (!memberUserId) continue;
        membershipByUserId.set(memberUserId, membership.role ?? null);
    }

    let created = 0;
    const issues: SyncIssue[] = [];
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
                    issues.push({
                        organizationId,
                        userId: admin.clerkId,
                        error: 'Failed to update organization membership role',
                    });
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
        } catch (error) {
            issues.push({
                organizationId,
                userId: admin.clerkId,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Failed to create organization membership',
            });
        }
    }
    return { created, issues };
}

/**
 * Ensure every Neon DB ADMIN user is an org member/admin across all partner orgs.
 * Returns summary counts.
 */
export async function ensureDbAdminsAcrossAllOrganizations(role: ClerkRole = 'org:admin'): Promise<{
    organizationsProcessed: number;
    membershipsCreated: number;
    issues: SyncIssue[];
}> {
    const orgIds = await prisma.partner.findMany({
        select: { clerkOrganizationId: true },
    });
    let membershipsCreated = 0;
    const issues: SyncIssue[] = [];
    for (const org of orgIds) {
        try {
            const result = await ensureDbAdminsInOrganization(org.clerkOrganizationId, role);
            membershipsCreated += result.created;
            issues.push(...result.issues);
        } catch (error) {
            issues.push({
                organizationId: org.clerkOrganizationId,
                error: error instanceof Error ? error.message : 'Organization sync failed',
            });
        }
    }
    return {
        organizationsProcessed: orgIds.length,
        membershipsCreated,
        issues,
    };
}
