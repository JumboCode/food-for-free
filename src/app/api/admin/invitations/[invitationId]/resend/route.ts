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

export async function POST(req: NextRequest, { params }: { params: { invitationId: string } }) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const { invitationId } = params;
        const client = await clerkClient();

        // Get the invitation details
        const invitation = await client.organizations.getOrganizationInvitation({
            invitationId,
            organizationId: '',
        });

        // Revoke the old invitation
        await client.organizations.revokeOrganizationInvitation({
            invitationId,
            requestingUserId: userId,
            organizationId: '',
        });

        // Create a new invitation
        const newInvitation = await client.organizations.createOrganizationInvitation({
            organizationId: invitation.organizationId,
            emailAddress: invitation.emailAddress,
            inviterUserId: userId,
            role: invitation.role,
        });

        return NextResponse.json({
            invitation: {
                id: newInvitation.id,
                emailAddress: newInvitation.emailAddress,
                organizationId: newInvitation.organizationId,
                status: newInvitation.status,
            },
        });
    } catch (error) {
        console.error('Error resending invitation:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to resend invitation' }, { status: 500 });
    }
}
