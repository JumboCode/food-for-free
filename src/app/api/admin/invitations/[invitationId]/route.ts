import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';

export async function DELETE(
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

        if (!organizationId) {
            return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
        }

        const client = await clerkClient();

        await client.organizations.revokeOrganizationInvitation({
            invitationId,
            organizationId,
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
