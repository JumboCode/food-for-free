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
        const body = (await req.json()) as { name?: string; householdId18?: string };
        const nextName = body.name?.trim();
        const nextHouseholdId18 = body.householdId18?.trim();

        if (!nextName && !nextHouseholdId18) {
            return NextResponse.json(
                { error: 'Organization name or householdId18 is required' },
                { status: 400 }
            );
        }

        const client = await clerkClient();
        const existingPartner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: organizationId },
            select: { householdId18: true },
        });
        if (!existingPartner) {
            return NextResponse.json(
                { error: 'Organization partner record not found' },
                { status: 404 }
            );
        }

        if (nextName) {
            await client.organizations.updateOrganization(organizationId, {
                name: nextName,
            });
        }
        if (nextHouseholdId18) {
            await client.organizations.updateOrganizationMetadata(organizationId, {
                publicMetadata: { householdId18: nextHouseholdId18 },
            });
        }

        await prisma.partner.update({
            where: { householdId18: existingPartner.householdId18 },
            data: {
                ...(nextName ? { organizationName: nextName } : {}),
                ...(nextHouseholdId18 ? { householdId18: nextHouseholdId18 } : {}),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
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
        const partner = await prisma.partner.findUnique({
            where: { clerkOrganizationId: organizationId },
            select: { householdId18: true },
        });

        if (!partner) {
            return NextResponse.json(
                { error: 'Organization partner record not found in Neon' },
                { status: 404 }
            );
        }

        const memberships = await client.organizations.getOrganizationMembershipList({
            organizationId,
            limit: 500,
        });

        const memberUserIds = memberships.data
            .map(membership => membership.publicUserData?.userId)
            .filter((id): id is string => Boolean(id));

        const adminUsers = await prisma.user.findMany({
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

        await client.organizations.deleteOrganization(organizationId);

        await prisma.$transaction(async tx => {
            await tx.user.deleteMany({
                where: {
                    clerkId: { in: clerkUserIdsToDelete },
                },
            });

            const deletedPartners = await tx.partner.deleteMany({
                where: {
                    clerkOrganizationId: organizationId,
                    householdId18: partner.householdId18,
                },
            });

            if (deletedPartners.count === 0) {
                throw new Error('Failed to delete organization partner record from Neon');
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }
}
