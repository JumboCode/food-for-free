import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ invitationId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const { invitationId } = await params;
        const organizationId = req.nextUrl.searchParams.get('organizationId') ?? '';
        const invitationRedirectUrl = new URL('/sign-up', req.nextUrl.origin).toString();
        const client = await clerkClient();

        if (!organizationId) {
            return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
        }

        // Get the invitation details
        const invitation = await client.organizations.getOrganizationInvitation({
            invitationId,
            organizationId,
        });

        // Revoke the old invitation
        await client.organizations.revokeOrganizationInvitation({
            invitationId,
            requestingUserId: userId,
            organizationId,
        });

        // Create a new invitation
        const newInvitation = await client.organizations.createOrganizationInvitation({
            organizationId: invitation.organizationId,
            emailAddress: invitation.emailAddress,
            inviterUserId: userId,
            role: invitation.role,
            publicMetadata: invitation.publicMetadata,
            redirectUrl: invitationRedirectUrl,
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
