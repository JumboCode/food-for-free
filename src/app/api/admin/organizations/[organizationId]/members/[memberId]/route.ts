import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ organizationId: string; memberId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const { memberId } = await params;
        const body = (await req.json()) as { name?: string };
        const nextName = body.name?.trim();

        if (!nextName) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: memberId },
            data: { name: nextName },
            select: { id: true, name: true },
        });

        return NextResponse.json({ user: updated });
    } catch (error) {
        console.error('Error updating member:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
    }
}

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

        // Delete Clerk account as requested. Ignore 404 if already removed.
        try {
            await client.users.deleteUser(user.clerkId);
        } catch (clerkErr) {
            const status = (clerkErr as { status?: number }).status;
            if (status !== 404) throw clerkErr;
        }

        // Remove Neon user row after Clerk deletion
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
