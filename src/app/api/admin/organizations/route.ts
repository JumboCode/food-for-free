import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/admin';
import { extractClerkErrorMessage } from '~/lib/partnerInvitationMembership';
import { prisma } from '~/lib/prisma';
import { ensureDbAdminsInOrganization } from '~/lib/syncDbAdminsToClerkOrgs';

async function clerkAllOrganizations(client: Awaited<ReturnType<typeof clerkClient>>) {
    const pageSize = 100;
    const data: NonNullable<
        Awaited<ReturnType<typeof client.organizations.getOrganizationList>>['data']
    > = [];
    for (let offset = 0; offset < 20_000; offset += pageSize) {
        const page = await client.organizations.getOrganizationList({
            limit: pageSize,
            offset,
        });
        const chunk = page.data ?? [];
        data.push(...chunk);
        if (chunk.length < pageSize) break;
    }
    return data;
}

function readableServerError(error: unknown): string {
    const clerk = extractClerkErrorMessage(error);
    if (clerk) return clerk;
    return error instanceof Error ? error.message : 'Unexpected error';
}

// GET - List all organizations
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await requireAdmin();

        const client = await clerkClient();

        const clerkOrgs = await clerkAllOrganizations(client);

        const clerkOrgIds = clerkOrgs.map(org => org.id);
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
                { clerkOrganizationId: string; membersCount: number }[]
            >`
                SELECT
                    p."clerkOrganizationId",
                    CAST(
                        COUNT(DISTINCT upm."userId") FILTER (
                            WHERE LOWER(TRIM(COALESCE(p."organizationName", ''))) = 'food for free'
                               OR u."role" <> 'ADMIN'::"Role"
                        )
                        AS INTEGER
                    ) AS "membersCount"
                FROM "Partner" p
                LEFT JOIN "UserPartnerMembership" upm ON upm."partnerId" = p."householdId18"
                LEFT JOIN "User" u ON u."id" = upm."userId"
                GROUP BY p."clerkOrganizationId"
            `;
            for (const row of membershipCounts) {
                if (clerkOrgIds.includes(row.clerkOrganizationId)) {
                    memberCountByOrgId.set(row.clerkOrganizationId, row.membersCount ?? 0);
                }
            }
        }
        const householdIdByOrgId = new Map(
            partners.map(partner => [partner.clerkOrganizationId, partner.householdId18])
        );

        const organizationsWithCounts = clerkOrgs.map(org => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
            membersCount: memberCountByOrgId.get(org.id) ?? 0,
            householdId18: householdIdByOrgId.get(org.id) ?? null,
            createdAt: org.createdAt.toString(),
        }));

        return NextResponse.json({
            organizations: organizationsWithCounts,
            total: organizationsWithCounts.length,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json(
            { error: 'Failed to fetch organizations.', detail: readableServerError(error) },
            { status: 500 }
        );
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
        let organization: Awaited<ReturnType<typeof client.organizations.createOrganization>>;
        try {
            organization = await client.organizations.createOrganization({
                name: trimmedName,
                createdBy: userId,
                publicMetadata: trimmedId ? { householdId18: trimmedId } : {},
            });
        } catch (clerkCreateError) {
            return NextResponse.json(
                {
                    error:
                        readableServerError(clerkCreateError) ||
                        'Clerk refused to create the organization.',
                },
                { status: 400 }
            );
        }

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

            return NextResponse.json(
                {
                    error: 'Database step failed while saving the partner organization.',
                    detail: readableServerError(dbError),
                },
                { status: 500 }
            );
        }

        try {
            await ensureDbAdminsInOrganization(organization.id, 'org:admin');
        } catch (syncError) {
            await prisma.partner
                .deleteMany({ where: { clerkOrganizationId: organization.id } })
                .catch(() => {});
            try {
                await client.organizations.deleteOrganization(organization.id);
            } catch {}

            return NextResponse.json(
                {
                    error: 'Organization was rolled back because Clerk admin memberships could not be synced.',
                    detail: readableServerError(syncError),
                },
                { status: 500 }
            );
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

        return NextResponse.json(
            { error: 'Failed to create organization.', detail: readableServerError(error) },
            { status: 500 }
        );
    }
}
