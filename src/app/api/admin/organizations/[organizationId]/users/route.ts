import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

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

        type OrganizationUserRow = {
            id: string;
            clerkId: string;
            role: 'ADMIN' | 'PARTNER';
            name: string | null;
            email: string;
            createdAt: Date;
        };

        const users = await prisma.$queryRaw<OrganizationUserRow[]>`
            SELECT DISTINCT
                u."id",
                u."clerkId",
                u."role"::text as "role",
                u."name",
                u."email",
                u."createdAt"
            FROM "User" u
            INNER JOIN "UserPartnerMembership" upm ON upm."userId" = u."id"
            INNER JOIN "Partner" p ON p."householdId18" = upm."partnerId"
            WHERE p."clerkOrganizationId" = ${organizationId}
            ORDER BY u."createdAt" DESC
        `;

        const invitations = await client.organizations.getOrganizationInvitationList({
            organizationId,
            status: ['pending'],
            limit: 100,
        });

        const members = users.map(user => ({
            id: user.id,
            userId: user.clerkId,
            organizationId,
            role: user.role,
            user: {
                id: user.id,
                firstName: user.name ?? null,
                lastName: null,
                email: user.email,
            },
        }));

        return NextResponse.json({
            members,
            invitations: invitations.data.map(inv => ({
                id: inv.id,
                emailAddress: inv.emailAddress,
                name:
                    typeof inv.publicMetadata?.inviteeName === 'string'
                        ? inv.publicMetadata.inviteeName
                        : null,
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
