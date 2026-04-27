import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { normalizeDestinationName } from '~/lib/destinationNameFilter';
import { getOverviewScope, overviewScopeErrorResponse } from '~/lib/overviewAccess';
import type { PartnerOrgCard } from '@/types/partner';

/**
 * GET /api/overview/partners
 * Partner accounts: their org only. Admins: Clerk partners plus any distribution destinations
 * seen in destination tables or inventory (without duplicating names that already map to a Partner).
 */
export async function GET() {
    try {
        const scope = await getOverviewScope(null);
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        if (scope.kind === 'partner') {
            return NextResponse.json({
                partners: [
                    {
                        id: `p-${scope.partnerHouseholdId18}`,
                        name: scope.destination,
                        householdId18: scope.partnerHouseholdId18,
                        location: '',
                        type: 'Partner',
                    },
                ],
                partnerDashboard: true,
            });
        }

        const [partnerRows, destinationNameRows] = await Promise.all([
            prisma.partner.findMany({
                select: { organizationName: true, householdId18: true },
                orderBy: { organizationName: 'asc' },
            }),
            prisma.$queryRaw<{ name: string | null }[]>`
                SELECT DISTINCT TRIM(x.n) AS "name"
                FROM (
                    SELECT TRIM(d."householdName") AS n
                    FROM "AllProductPackageDestinations" d
                    WHERE TRIM(COALESCE(d."householdName", '')) <> ''

                    UNION

                    SELECT TRIM(j."householdName") AS n
                    FROM "JustEatsBoxes" j
                    WHERE TRIM(COALESCE(j."householdName", '')) <> ''

                    UNION

                    SELECT TRIM(t."destination") AS n
                    FROM "AllInventoryTransactions" t
                    WHERE TRIM(COALESCE(t."destination", '')) <> ''
                      AND LOWER(TRIM(COALESCE(t."inventoryType", ''))) = 'distribution'
                ) x
                WHERE TRIM(COALESCE(x.n, '')) <> ''
                ORDER BY 1 ASC
            `,
        ]);

        const byNormalized = new Map<string, PartnerOrgCard>();

        for (const partner of partnerRows) {
            const name = partner.organizationName?.trim() ?? '';
            if (!name) continue;
            const key = normalizeDestinationName(name);
            byNormalized.set(key, {
                id: `p-${partner.householdId18}`,
                name,
                householdId18: partner.householdId18,
                location: '',
                type: 'Partner',
            });
        }

        for (const row of destinationNameRows) {
            const name = row.name?.trim() ?? '';
            if (!name) continue;
            const key = normalizeDestinationName(name);
            if (byNormalized.has(key)) continue;
            byNormalized.set(key, {
                id: `d-${key}`,
                name,
                householdId18: null,
                location: '',
                type: 'Destination',
            });
        }

        const partners = [...byNormalized.values()].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
        );

        return NextResponse.json({
            partners,
            partnerDashboard: false,
        });
    } catch (err: unknown) {
        console.error('Overview partners error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load partners' },
            { status: 500 }
        );
    }
}
