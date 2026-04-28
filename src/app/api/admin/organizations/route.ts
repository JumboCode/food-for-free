import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
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
            include: {
                _count: {
                    select: { users: true },
                },
            },
        });

        const memberCountByOrgId = new Map(
            partners.map(partner => [partner.clerkOrganizationId, partner._count.users])
        );
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
        console.error('Error fetching organizations:', error);

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

        if (!name) {
            return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
        }

        const trimmedId =
            typeof householdId18 === 'string' && householdId18.trim() ? householdId18.trim() : null;
        const syntheticHouseholdId18 = trimmedId ?? `pending-${randomUUID().replace(/-/g, '')}`;

        const client = await clerkClient();

        const organization = await client.organizations.createOrganization({
            name,
            createdBy: userId,
            publicMetadata: trimmedId ? { householdId18: trimmedId } : {},
        });

        await prisma.partner.create({
            data: {
                householdId18: syntheticHouseholdId18,
                organizationName: name,
                clerkOrganizationId: organization.id,
            },
        });

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
        console.error('Error creating organization:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }
}
