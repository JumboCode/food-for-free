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

export async function DELETE(
    req: NextRequest,
    { params }: { params: { organizationId: string; memberId: string } }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin(userId);

        const { organizationId, memberId } = params;
        const client = await clerkClient();

        // Delete the membership
        await client.organizations.deleteOrganizationMembership({
            organizationId,
            userId: memberId,
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing member:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
