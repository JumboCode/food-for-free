import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';
import { isDistributorPartnerOrgName } from '~/lib/distributorPartner';

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
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: organizationId },
            select: { organizationName: true },
        });
        const isDistributorOrg = isDistributorPartnerOrgName(partner?.organizationName);

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
              AND (${isDistributorOrg} OR u."role" <> 'ADMIN'::"Role")
            ORDER BY u."createdAt" DESC
        `;

        const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId,
            limit: 500,
        });

        const usersByClerkId = new Map(users.map(user => [user.clerkId, user]));
        const missingClerkIds = memberships.data
            .map(membership => membership.publicUserData?.userId)
            .filter((id): id is string => Boolean(id))
            .filter(id => !usersByClerkId.has(id));

        if (missingClerkIds.length > 0) {
            const missingUsers = await prisma.user.findMany({
                where: { clerkId: { in: missingClerkIds } },
                select: {
                    id: true,
                    clerkId: true,
                    role: true,
                    name: true,
                    email: true,
                    createdAt: true,
                },
            });
            for (const user of missingUsers) {
                if (!isDistributorOrg && user.role === 'ADMIN') continue;
                usersByClerkId.set(user.clerkId, {
                    id: user.id,
                    clerkId: user.clerkId,
                    role: user.role,
                    name: user.name,
                    email: user.email,
                    createdAt: user.createdAt,
                });
            }
        }

        const invitations = await client.organizations.getOrganizationInvitationList({
            organizationId,
            status: ['pending'],
            limit: 100,
        });

        const members = [...usersByClerkId.values()]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map(user => ({
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
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to fetch organization users' }, { status: 500 });
    }
}
