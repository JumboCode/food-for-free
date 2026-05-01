import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';
import { PENDING_PARTNER_HOUSEHOLD_PREFIX } from '~/lib/overviewAccess';
import { orgNamesEqualSql } from '~/lib/inventoryDistributionSql';
import { syncNeonUserRoleFromClerkOrgs } from '~/lib/syncNeonUserRoleFromClerkOrgs';

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
            select: { householdId18: true, organizationName: true },
        });
        if (!existingPartner) {
            return NextResponse.json(
                { error: 'Organization partner record not found' },
                { status: 404 }
            );
        }

        const isPendingPartner =
            existingPartner.householdId18?.startsWith(PENDING_PARTNER_HOUSEHOLD_PREFIX) ?? false;
        const isNameChange =
            typeof nextName === 'string' &&
            nextName.toLowerCase() !==
                (existingPartner.organizationName ?? '').trim().toLowerCase();
        if (isPendingPartner && isNameChange) {
            return NextResponse.json(
                {
                    error: 'Organizations with pending household IDs cannot be renamed. Create a new organization with the updated name.',
                },
                { status: 409 }
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

        await prisma.$transaction(async tx => {
            await tx.partner.update({
                where: { householdId18: existingPartner.householdId18 },
                data: {
                    ...(nextName ? { organizationName: nextName } : {}),
                    ...(nextHouseholdId18 ? { householdId18: nextHouseholdId18 } : {}),
                },
            });

            // Future-safe rename backfill:
            // For non-pending orgs, keep orphan distribution rows aligned to the canonical org name.
            if (isNameChange && !isPendingPartner && nextName) {
                const priorName = (existingPartner.organizationName ?? '').trim();
                if (priorName.length > 0) {
                    await tx.$executeRaw`
                        UPDATE "AllInventoryTransactions" t
                        SET "destination" = ${nextName}
                        WHERE TRIM(COALESCE(t."destination", '')) <> ''
                          AND LOWER(TRIM(COALESCE(t."inventoryType", ''))) = 'distribution'
                          AND ${orgNamesEqualSql(Prisma.sql`t."destination"`, Prisma.sql`${priorName}`)}
                          AND NOT ${orgNamesEqualSql(Prisma.sql`t."destination"`, Prisma.sql`${nextName}`)}
                    `;
                }
            }
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

        await client.organizations.deleteOrganization(organizationId);

        await prisma.$transaction(async tx => {
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

        // Recompute role for affected users now that one org membership was removed.
        for (const memberClerkId of memberUserIds) {
            await syncNeonUserRoleFromClerkOrgs(memberClerkId);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }
}
