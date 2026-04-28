import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { normalizeDestinationName } from '~/lib/destinationNameFilter';
import { getOverviewScope, overviewScopeErrorResponse } from '~/lib/overviewAccess';
import {
    destinationStatusIncludedCondition,
    distributionInventoryTypeCondition,
    inventoryTxPoundsSql,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';
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
                WITH valid_joined AS (
                    SELECT
                        TRIM(COALESCE(d."householdName", '')) AS name,
                        SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS lbs
                    FROM "AllInventoryTransactions" t
                    INNER JOIN "AllPackagesByItem" p
                        ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                    INNER JOIN "AllProductPackageDestinations" d
                        ON d."productPackageId18" = p."productPackageId18"
                    WHERE TRIM(COALESCE(d."householdName", '')) <> ''
                      AND ${destinationStatusIncludedCondition}
                    GROUP BY TRIM(COALESCE(d."householdName", ''))
                    HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
                ),
                valid_orphan AS (
                    SELECT
                        TRIM(t."destination") AS name,
                        SUM(${inventoryTxPoundsSql()}) AS lbs
                    FROM "AllInventoryTransactions" t
                    WHERE TRIM(COALESCE(t."destination", '')) <> ''
                      AND ${distributionInventoryTypeCondition}
                      AND ${orphanInventoryCondition}
                    GROUP BY TRIM(t."destination")
                    HAVING SUM(${inventoryTxPoundsSql()}) > 0
                ),
                valid_just_eats AS (
                    SELECT
                        TRIM(COALESCE(pt."organizationName", j."householdName")) AS name,
                        SUM(COALESCE(j."numberDistributed", 1)) AS boxes
                    FROM "JustEatsBoxes" j
                    LEFT JOIN "Partner" pt ON pt."householdId18" = j."householdId"
                    WHERE TRIM(COALESCE(j."householdName", '')) <> ''
                    GROUP BY TRIM(COALESCE(pt."organizationName", j."householdName"))
                    HAVING SUM(COALESCE(j."numberDistributed", 1)) > 0
                )
                SELECT DISTINCT TRIM(name) AS "name"
                FROM (
                    SELECT name FROM valid_joined
                    UNION
                    SELECT name FROM valid_orphan
                    UNION
                    SELECT name FROM valid_just_eats
                ) v
                WHERE TRIM(COALESCE(name, '')) <> ''
                ORDER BY 1 ASC
            `,
        ]);

        const byNormalized = new Map<string, PartnerOrgCard>();
        const validNormalizedNames = new Set(
            destinationNameRows
                .map(row => row.name?.trim() ?? '')
                .filter(Boolean)
                .map(name => normalizeDestinationName(name))
        );

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
