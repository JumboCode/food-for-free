import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

async function requireAdmin(userId: string) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    const isAdmin = user.publicMetadata?.role === 'admin';

    if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
    }

    return user;
}

export async function GET(req: NextRequest, { params }: { params: { organizationId: string } }) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const { organizationId } = params;
        const client = await clerkClient();

        // Get organization members
        const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId,
            limit: 100,
        });

        // Get user details for each member
        const members = await Promise.all(
            memberships.data
                .filter(membership => membership.publicUserData !== null) // ← Filter out nulls
                .map(async membership => {
                    const user = await client.users.getUser(membership.publicUserData!.userId);

                    return {
                        id: membership.id,
                        userId: user.id,
                        organizationId: membership.organization.id,
                        role: membership.role,
                        user: {
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            email: user.emailAddresses[0]?.emailAddress || '',
                            imageUrl: user.imageUrl,
                        },
                    };
                })
        );

        // Get pending invitations
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
