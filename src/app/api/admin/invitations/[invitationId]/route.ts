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

export async function DELETE(req: NextRequest, { params }: { params: { invitationId: string } }) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const { invitationId } = params;
        const client = await clerkClient();

        // Get the invitation first to find organizationId
        const invitation = await client.organizations.getOrganizationInvitation({
            invitationId,
            organizationId: '',
        });

        // Revoke the invitation with organizationId
        await client.organizations.revokeOrganizationInvitation({
            invitationId,
            organizationId: invitation.organizationId, // ← Add this!
            requestingUserId: userId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error revoking invitation:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }
}
