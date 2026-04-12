import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ organizationId: string; memberId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const { organizationId, memberId } = await params;

        // memberId is the Prisma user.id — look up the clerkId
        const user = await prisma.user.findUnique({ where: { id: memberId } });
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const client = await clerkClient();

        // Remove from Clerk org — ignore 404 if they're not an active member
        try {
            await client.organizations.deleteOrganizationMembership({
                organizationId,
                userId: user.clerkId,
            });
        } catch (clerkErr) {
            const status = (clerkErr as { status?: number }).status;
            if (status !== 404) throw clerkErr;
        }

        // Always remove from Prisma
        await prisma.user.delete({ where: { id: memberId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing member:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
