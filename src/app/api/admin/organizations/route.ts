import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

// GET - List all organizations
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const client = await clerkClient();

        // Get all organizations from Clerk
        const organizationsResponse = await client.organizations.getOrganizationList({
            limit: 100,
        });

        const clerkOrgIds = organizationsResponse.data.map(org => org.id);
        const partners = await prisma.partner.findMany({
            where: { clerkOrganizationId: { in: clerkOrgIds } },
            select: {
                householdId18: true,
                clerkOrganizationId: true,
            },
        });

        const memberCountByOrgId = new Map<string, number>();
        if (clerkOrgIds.length > 0) {
            const membershipCounts = await prisma.$queryRaw<
                { clerkOrganizationId: string; membersCount: bigint | number }[]
            >`
                SELECT
                    p."clerkOrganizationId",
                    COUNT(DISTINCT upm."userId") AS "membersCount"
                FROM "Partner" p
                LEFT JOIN "UserPartnerMembership" upm ON upm."partnerId" = p."householdId18"
                GROUP BY p."clerkOrganizationId"
            `;
            for (const row of membershipCounts) {
                if (clerkOrgIds.includes(row.clerkOrganizationId)) {
                    memberCountByOrgId.set(row.clerkOrganizationId, Number(row.membersCount ?? 0));
                }
            }
        }
        const householdIdByOrgId = new Map(
            partners.map(partner => [partner.clerkOrganizationId, partner.householdId18])
        );

        const organizationsWithCounts = organizationsResponse.data.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            membersCount: memberCountByOrgId.get(org.id) ?? 0,
            householdId18: householdIdByOrgId.get(org.id) ?? null,
            createdAt: org.createdAt.toString(),
        }));

        return NextResponse.json({
            organizations: organizationsWithCounts,
            total: organizationsResponse.totalCount,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }
}

// POST - Create new organization
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const body = await req.json();
        const { name, householdId18 } = body as {
            name?: string;
            householdId18?: string | null;
        };

        const trimmedName = typeof name === 'string' ? name.trim() : '';

        if (!trimmedName) {
            return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
        }

        const trimmedId =
            typeof householdId18 === 'string' && householdId18.trim() ? householdId18.trim() : null;
        const syntheticHouseholdId18 = trimmedId ?? `pending-${randomUUID().replace(/-/g, '')}`;

        if (trimmedId) {
            const existingPartner = await prisma.partner.findUnique({
                where: { householdId18: trimmedId },
                select: { organizationName: true },
            });
            if (existingPartner) {
                return NextResponse.json(
                    {
                        error: `Household ID already exists for organization "${existingPartner.organizationName}"`,
                    },
                    { status: 409 }
                );
            }
        }

        const client = await clerkClient();
        const organization = await client.organizations.createOrganization({
            name: trimmedName,
            createdBy: userId,
            publicMetadata: trimmedId ? { householdId18: trimmedId } : {},
        });

        try {
            await prisma.partner.create({
                data: {
                    householdId18: syntheticHouseholdId18,
                    organizationName: trimmedName,
                    clerkOrganizationId: organization.id,
                },
            });
        } catch (dbError) {
            try {
                await client.organizations.deleteOrganization(organization.id);
            } catch {}

            if (
                dbError instanceof Prisma.PrismaClientKnownRequestError &&
                dbError.code === 'P2002'
            ) {
                return NextResponse.json(
                    { error: 'Household ID or organization mapping already exists' },
                    { status: 409 }
                );
            }

            throw dbError;
        }

        return NextResponse.json({
            organization: {
                id: organization.id,
                name: organization.name,
                slug: organization.slug,
                membersCount: 1, // Creator is automatically a member
                createdAt: organization.createdAt.toString(),
            },
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }
}
