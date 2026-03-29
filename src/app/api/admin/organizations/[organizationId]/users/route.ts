import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import type { OrganizationMembership } from '@clerk/backend';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

/**
 * Pending invitations: Clerk Backend API `getOrganizationInvitationList` with `status: ['pending']`.
 * Those are invites not yet accepted. Clerk Dashboard UI may group or label them differently,
 * but this is the same source of truth the Dashboard uses for API-backed lists.
 */
async function fetchAllOrganizationMemberships(
    organizationId: string
): Promise<OrganizationMembership[]> {
    const client = await clerkClient();
    const all: OrganizationMembership[] = [];
    const limit = 100;
    let offset = 0;

    for (;;) {
        const res = await client.organizations.getOrganizationMembershipList({
            organizationId,
            limit,
            offset,
        });
        all.push(...res.data);
        if (res.data.length < limit) break;
        offset += limit;
    }

    return all;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const { organizationId } = await params;
        const client = await clerkClient();

        const [clerkMemberships, neonUsers] = await Promise.all([
            fetchAllOrganizationMemberships(organizationId),
            prisma.user.findMany({
                where: {
                    partner: {
                        clerkOrganizationId: organizationId,
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        const neonByClerkId = new Map(neonUsers.map(u => [u.clerkId, u]));

        const clerkUserIds = [
            ...new Set(
                clerkMemberships
                    .map(m => m.publicUserData?.userId)
                    .filter((id): id is string => Boolean(id))
            ),
        ];

        const namesByClerkId = new Map<
            string,
            { firstName: string | null; lastName: string | null }
        >();
        await Promise.all(
            clerkUserIds.map(async id => {
                try {
                    const u = await client.users.getUser(id);
                    namesByClerkId.set(id, {
                        firstName: u.firstName ?? null,
                        lastName: u.lastName ?? null,
                    });
                } catch {
                    namesByClerkId.set(id, { firstName: null, lastName: null });
                }
            })
        );

        const members = clerkMemberships
            .map(m => {
                const pud = m.publicUserData;
                if (!pud) return null;

                const clerkUserId = pud.userId;
                const nu = neonByClerkId.get(clerkUserId);
                const enriched = namesByClerkId.get(clerkUserId);
                const firstName = enriched?.firstName ?? pud.firstName ?? null;
                const lastName = enriched?.lastName ?? pud.lastName ?? null;
                const email = nu?.email ?? pud.identifier ?? '';

                return {
                    id: clerkUserId,
                    userId: clerkUserId,
                    organizationId,
                    role: nu?.role ?? String(m.role),
                    user: {
                        id: nu?.id ?? clerkUserId,
                        firstName,
                        lastName,
                        email,
                    },
                };
            })
            .filter((row): row is NonNullable<typeof row> => row != null);

        const invitations = await client.organizations.getOrganizationInvitationList({
            organizationId,
            status: ['pending'],
            limit: 100,
        });

        return NextResponse.json({
            members,
            invitations: invitations.data.map(inv => ({
                id: inv.id,
                emailAddress: inv.emailAddress,
                role: inv.role,
                status: inv.status,
                createdAt: inv.createdAt.toString(),
            })),
        });
    } catch (error) {
        console.error('Error fetching organization users:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to fetch organization users' }, { status: 500 });
    }
}
