import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ organizationId: string }> }
) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const { organizationId } = await params;
        const body = (await req.json()) as { name?: string };
        const nextName = body.name?.trim();

        if (!nextName) {
            return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
        }

        const client = await clerkClient();
        await client.organizations.updateOrganization(organizationId, {
            name: nextName,
        });

        await prisma.partner.updateMany({
            where: { clerkOrganizationId: organizationId },
            data: { organizationName: nextName },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating organization:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
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

        const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId,
            limit: 500,
        });

        const memberUserIds = memberships.data
            .map(membership => membership.publicUserData?.userId)
            .filter((id): id is string => Boolean(id));

        await prisma.$transaction(async tx => {
            const partner = await tx.partner.findUnique({
                where: { clerkOrganizationId: organizationId },
                select: { householdId18: true },
            });

            if (!partner) {
                return;
            }

            const adminUsers = await tx.user.findMany({
                where: {
                    clerkId: { in: memberUserIds },
                    role: 'ADMIN',
                },
                select: { clerkId: true },
            });

            const adminUserIds = new Set(adminUsers.map(admin => admin.clerkId));

            // Never delete the currently signed-in admin account or any admin accounts.
            const clerkUserIdsToDelete = memberUserIds.filter(
                id => id !== userId && !adminUserIds.has(id)
            );

            for (const clerkUserId of clerkUserIdsToDelete) {
                await client.users.deleteUser(clerkUserId);
            }

            await tx.user.deleteMany({
                where: {
                    OR: [
                        { partnerId: partner.householdId18, clerkId: { in: clerkUserIdsToDelete } },
                        { clerkId: { in: clerkUserIdsToDelete } },
                    ],
                },
            });

            await tx.partner.delete({
                where: { householdId18: partner.householdId18 },
            });
        });

        await client.organizations.deleteOrganization(organizationId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting organization:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }
}
