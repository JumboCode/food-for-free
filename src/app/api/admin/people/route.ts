import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

export type AdminPersonMembership = {
    organizationId: string;
    organizationName: string;
    role: string;
    status: 'Active' | 'Invited';
    invitationId?: string;
};

export type AdminPersonGroup = {
    rowKey: string;
    name: string | null;
    email: string;
    memberships: AdminPersonMembership[];
};

function normalizePersonEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * GET /api/admin/people
 * Partner directory only: Neon users with role PARTNER and pending partner invites (Clerk).
 * Console admins are managed elsewhere, not listed here.
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const partners = await prisma.partner.findMany({
            select: {
                clerkOrganizationId: true,
                organizationName: true,
                householdId18: true,
            },
            orderBy: { organizationName: 'asc' },
        });

        type OrgUserRow = {
            id: string;
            clerkId: string;
            role: string;
            name: string | null;
            email: string;
        };

        type FlatMembership = AdminPersonMembership & { name: string | null; email: string };
        const flat: FlatMembership[] = [];
        const client = await clerkClient();

        for (const p of partners) {
            const orgId = p.clerkOrganizationId;
            const orgName = p.organizationName;

            const users = await prisma.$queryRaw<OrgUserRow[]>`
                SELECT
                    u."id",
                    u."clerkId",
                    u."role"::text as "role",
                    u."name",
                    u."email"
                FROM "User" u
                INNER JOIN "UserPartnerMembership" upm ON upm."userId" = u."id"
                INNER JOIN "Partner" p2 ON p2."householdId18" = upm."partnerId"
                WHERE p2."clerkOrganizationId" = ${orgId}
                    AND u."role" = 'PARTNER'::"Role"
                ORDER BY LOWER(u."email")
            `;

            for (const u of users) {
                flat.push({
                    name: u.name,
                    email: u.email,
                    organizationId: orgId,
                    organizationName: orgName,
                    role: u.role,
                    status: 'Active',
                });
            }

            try {
                const invitations = await client.organizations.getOrganizationInvitationList({
                    organizationId: orgId,
                    status: ['pending'],
                    limit: 100,
                });
                for (const inv of invitations.data) {
                    if (inv.role !== 'org:member') {
                        continue;
                    }
                    const inviteName =
                        typeof inv.publicMetadata?.inviteeName === 'string'
                            ? inv.publicMetadata.inviteeName.trim() || null
                            : null;
                    flat.push({
                        name: inviteName,
                        email: inv.emailAddress,
                        organizationId: orgId,
                        organizationName: orgName,
                        role: inv.role,
                        status: 'Invited',
                        invitationId: inv.id,
                    });
                }
            } catch {
                // Skip orgs where invitation list is unavailable
            }
        }

        const byEmail = new Map<
            string,
            { email: string; name: string | null; memberships: AdminPersonMembership[] }
        >();

        for (const row of flat) {
            const key = normalizePersonEmail(row.email);
            const membership: AdminPersonMembership = {
                organizationId: row.organizationId,
                organizationName: row.organizationName,
                role: row.role,
                status: row.status,
                ...(row.invitationId ? { invitationId: row.invitationId } : {}),
            };

            const existing = byEmail.get(key);
            if (!existing) {
                byEmail.set(key, {
                    email: row.email.trim(),
                    name: row.name,
                    memberships: [membership],
                });
                continue;
            }

            if (!existing.name?.trim() && row.name?.trim()) {
                existing.name = row.name;
            }

            const dup = existing.memberships.some(m => {
                if (m.organizationId !== membership.organizationId) return false;
                if (m.status !== membership.status) return false;
                if (m.status === 'Invited') {
                    return m.invitationId === membership.invitationId;
                }
                return true;
            });
            if (!dup) {
                existing.memberships.push(membership);
            }
        }

        const people: AdminPersonGroup[] = [...byEmail.values()].map(v => ({
            rowKey: `person-${normalizePersonEmail(v.email)}`,
            name: v.name,
            email: v.email,
            memberships: [...v.memberships].sort((a, b) =>
                a.organizationName.localeCompare(b.organizationName, undefined, {
                    sensitivity: 'base',
                })
            ),
        }));

        people.sort((a, b) => a.email.localeCompare(b.email, undefined, { sensitivity: 'base' }));

        return NextResponse.json({ people });
    } catch (error) {
        console.error('admin/people GET:', error);
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to load people' }, { status: 500 });
    }
}
