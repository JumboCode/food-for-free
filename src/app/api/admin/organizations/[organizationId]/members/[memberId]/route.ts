import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';
import { syncNeonUserRoleFromClerkOrgs } from '~/lib/syncNeonUserRoleFromClerkOrgs';

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
        if (user.clerkId === userId) {
            return NextResponse.json(
                { error: 'You cannot delete your own account from Admin Console.' },
                { status: 400 }
            );
        }

        const client = await clerkClient();

        // Remove from this organization only (user may still belong to other orgs).
        try {
            await client.organizations.deleteOrganizationMembership({
                organizationId,
                userId: user.clerkId,
            });
        } catch (clerkErr) {
            const status = (clerkErr as { status?: number }).status;
            if (status !== 404) throw clerkErr;
        }

        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: organizationId },
            select: { householdId18: true },
        });

        if (partner) {
            await prisma.userPartnerMembership.deleteMany({
                where: {
                    userId: user.id,
                    partnerId: partner.householdId18,
                },
            });
        }

        await syncNeonUserRoleFromClerkOrgs(user.clerkId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing member:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }
}
