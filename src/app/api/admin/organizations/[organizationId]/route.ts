import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

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

        // Never delete the currently signed-in admin account.
        const clerkUserIdsToDelete = memberUserIds.filter(id => id !== userId);

        for (const clerkUserId of clerkUserIdsToDelete) {
            await client.users.deleteUser(clerkUserId);
        }

        await prisma.$transaction(async tx => {
            const partner = await tx.partner.findUnique({
                where: { clerkOrganizationId: organizationId },
                select: { householdId18: true },
            });

            if (!partner) {
                return;
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
