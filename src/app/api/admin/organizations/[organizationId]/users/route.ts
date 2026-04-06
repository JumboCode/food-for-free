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

        const partner = await prisma.partner.findUnique({
            where: {
                clerkOrganizationId: organizationId,
            },
        });

        if (!partner) {
            return NextResponse.json({
                members: [],
                invitations: invitations.data.map(inv => ({
                    id: inv.id,
                    emailAddress: inv.emailAddress,
                    role: inv.role,
                    status: inv.status,
                    createdAt: inv.createdAt.toString(),
                })),
            });
        }

        // Then find users by partnerId
        const users = await prisma.user.findMany({
            where: {
                partnerId: partner.id,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        const invitations = await client.organizations.getOrganizationInvitationList({
            organizationId,
            status: ['pending'],
            limit: 100,
        });

        // Fetch user details from Clerk to get firstName/lastName
        const membersWithNames = await Promise.all(
            users.map(async user => {
                try {
                    const clerkUser = await client.users.getUser(user.clerkId);
                    return {
                        id: user.id,
                        userId: user.clerkId,
                        organizationId,
                        role: user.role,
                        user: {
                            id: user.id,
                            firstName: clerkUser.firstName,
                            lastName: clerkUser.lastName,
                            email: user.email,
                        },
                    };
                } catch (error) {
                    console.error(`Failed to fetch Clerk user ${user.clerkId}:`, error);
                    // Fallback if Clerk fetch fails
                    return {
                        id: user.id,
                        userId: user.clerkId,
                        organizationId,
                        role: user.role,
                        user: {
                            id: user.id,
                            firstName: null,
                            lastName: null,
                            email: user.email,
                        },
                    };
                }
            })
        );

        return NextResponse.json({
            members: membersWithNames,
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
