import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import type { OverviewScope } from '~/lib/overviewAccess';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeEffectiveHouseholdId18,
    scopeOrganizationNameFilter,
} from '~/lib/overviewAccess';
import {
    distributionInventoryTypeCondition,
    inventoryTxPoundsSql,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';

function parseDateRange(searchParams: URLSearchParams): { start: Date; end: Date } | null {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (!startParam || !endParam) return null;
    const parseYmdLocal = (value: string): Date | null => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!m) return null;
        const y = Number.parseInt(m[1], 10);
        const mon = Number.parseInt(m[2], 10);
        const d = Number.parseInt(m[3], 10);
        const date = new Date(y, mon - 1, d);
        if (date.getFullYear() !== y || date.getMonth() !== mon - 1 || date.getDate() !== d) {
            return null;
        }
        return date;
    };
    const start = parseYmdLocal(startParam);
    const end = parseYmdLocal(endParam);
    if (!start || !end) return null;
    end.setHours(23, 59, 59, 999);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    return { start, end };
}

function getDefaultRange(): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - 29);
    return { start, end };
}

type BulkRescueStatsRow = {
    totalPoundsDelivered: number | null;
    deliveriesCompleted: number;
};

type JustEatsStatsRow = {
    justEatsPoundsDelivered: number | null;
    justEatsTotalDeliveries: number;
};

function destinationLabel(scope: OverviewScope): string {
    if (scope.kind === 'partner' || scope.kind === 'admin') {
        return scope.destination?.trim() ?? '';
    }
    return '';
}

async function queryBulkAndRescueStats(
    range: { start: Date; end: Date },
    scope: OverviewScope
): Promise<BulkRescueStatsRow> {
    const orgNameOnly = scopeOrganizationNameFilter(scope);
    if (orgNameOnly) {
        const rows = await prisma.$queryRaw<BulkRescueStatsRow[]>`
            WITH joined AS (
                SELECT
                    DATE_TRUNC('day', d."date") AS day_bucket,
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS day_pounds
                FROM "AllProductPackageDestinations" d
                LEFT JOIN "AllPackagesByItem" p
                    ON p."productPackageId18" = d."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                  AND LOWER(TRIM(d."householdName")) = LOWER(TRIM(${orgNameOnly}))
                GROUP BY DATE_TRUNC('day', d."date")
            ),
            orphan AS (
                SELECT
                    DATE_TRUNC('day', t."date") AS day_bucket,
                    SUM(${inventoryTxPoundsSql()}) AS day_pounds
                FROM "AllInventoryTransactions" t
                WHERE t."date" >= ${range.start}
                  AND t."date" <= ${range.end}
                  AND ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  AND TRIM(COALESCE(t."destination", '')) <> ''
                  AND LOWER(TRIM(t."destination")) = LOWER(TRIM(${orgNameOnly}))
                GROUP BY DATE_TRUNC('day', t."date")
            ),
            merged AS (
                SELECT day_bucket, day_pounds FROM joined
                UNION ALL
                SELECT day_bucket, day_pounds FROM orphan
            ),
            per_day AS (
                SELECT day_bucket, SUM(day_pounds) AS day_pounds
                FROM merged
                GROUP BY day_bucket
            )
            SELECT
                COALESCE(SUM(day_pounds) FILTER (WHERE day_pounds > 0), 0) AS "totalPoundsDelivered",
                COUNT(*) FILTER (WHERE day_pounds > 0)::int AS "deliveriesCompleted"
            FROM per_day
        `;
        return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
    }

    const hh = scopeEffectiveHouseholdId18(scope);

    if (hh) {
        const destLabel = destinationLabel(scope);
        const rows =
            destLabel.length > 0
                ? await prisma.$queryRaw<BulkRescueStatsRow[]>`
                    WITH joined AS (
                        SELECT
                            DATE_TRUNC('day', d."date") AS day_bucket,
                            SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS day_pounds
                        FROM "AllProductPackageDestinations" d
                        LEFT JOIN "AllPackagesByItem" p
                            ON p."productPackageId18" = d."productPackageId18"
                        WHERE d."householdId18" = ${hh}
                          AND d."date" >= ${range.start}
                          AND d."date" <= ${range.end}
                        GROUP BY DATE_TRUNC('day', d."date")
                    ),
                    orphan AS (
                        SELECT
                            DATE_TRUNC('day', t."date") AS day_bucket,
                            SUM(${inventoryTxPoundsSql()}) AS day_pounds
                        FROM "AllInventoryTransactions" t
                        WHERE t."date" >= ${range.start}
                          AND t."date" <= ${range.end}
                          AND ${distributionInventoryTypeCondition}
                          AND ${orphanInventoryCondition}
                          AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))
                        GROUP BY DATE_TRUNC('day', t."date")
                    ),
                    merged AS (
                        SELECT day_bucket, day_pounds FROM joined
                        UNION ALL
                        SELECT day_bucket, day_pounds FROM orphan
                    ),
                    per_day AS (
                        SELECT day_bucket, SUM(day_pounds) AS day_pounds
                        FROM merged
                        GROUP BY day_bucket
                    )
                    SELECT
                        COALESCE(SUM(day_pounds) FILTER (WHERE day_pounds > 0), 0) AS "totalPoundsDelivered",
                        COUNT(*) FILTER (WHERE day_pounds > 0)::int AS "deliveriesCompleted"
                    FROM per_day
                `
                : await prisma.$queryRaw<BulkRescueStatsRow[]>`
                    WITH per_day AS (
                        SELECT
                            DATE_TRUNC('day', d."date") AS day_bucket,
                            SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS day_pounds
                        FROM "AllProductPackageDestinations" d
                        LEFT JOIN "AllPackagesByItem" p
                            ON p."productPackageId18" = d."productPackageId18"
                        WHERE d."householdId18" = ${hh}
                          AND d."date" >= ${range.start}
                          AND d."date" <= ${range.end}
                        GROUP BY DATE_TRUNC('day', d."date")
                    )
                    SELECT
                        COALESCE(SUM(day_pounds) FILTER (WHERE day_pounds > 0), 0) AS "totalPoundsDelivered",
                        COUNT(*) FILTER (WHERE day_pounds > 0)::int AS "deliveriesCompleted"
                    FROM per_day
                `;
        return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
    }

    const rows = await prisma.$queryRaw<BulkRescueStatsRow[]>`
        WITH joined AS (
            SELECT
                DATE_TRUNC('day', d."date") AS day_bucket,
                d."householdId18" AS household_id,
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS delivery_pounds
            FROM "AllProductPackageDestinations" d
            LEFT JOIN "AllPackagesByItem" p
                ON p."productPackageId18" = d."productPackageId18"
            WHERE d."date" >= ${range.start}
              AND d."date" <= ${range.end}
            GROUP BY DATE_TRUNC('day', d."date"), d."householdId18"
        ),
        orphan AS (
            SELECT
                DATE_TRUNC('day', t."date") AS day_bucket,
                TRIM(t."destination") AS dest_key,
                SUM(${inventoryTxPoundsSql()}) AS delivery_pounds
            FROM "AllInventoryTransactions" t
            WHERE t."date" >= ${range.start}
              AND t."date" <= ${range.end}
              AND ${distributionInventoryTypeCondition}
              AND ${orphanInventoryCondition}
              AND TRIM(COALESCE(t."destination", '')) <> ''
            GROUP BY DATE_TRUNC('day', t."date"), TRIM(t."destination")
        ),
        combined AS (
            SELECT delivery_pounds FROM joined
            UNION ALL
            SELECT delivery_pounds FROM orphan
        )
        SELECT
            COALESCE(SUM(delivery_pounds) FILTER (WHERE delivery_pounds > 0), 0) AS "totalPoundsDelivered",
            COUNT(*) FILTER (WHERE delivery_pounds > 0)::int AS "deliveriesCompleted"
        FROM combined
    `;
    return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
}

async function queryJustEatsStats(
    range: { start: Date; end: Date },
    scope: OverviewScope
): Promise<JustEatsStatsRow> {
    const orgNameOnly = scopeOrganizationNameFilter(scope);
    if (orgNameOnly) {
        const rows = await prisma.$queryRaw<JustEatsStatsRow[]>`
            SELECT
                (
                    COALESCE(
                        SUM(
                            GREATEST(
                                COALESCE(j."numberPickedUp", 1),
                                COALESCE(j."numberDistributed", 1)
                            )
                        ),
                        0
                    ) * 25
                )::float AS "justEatsPoundsDelivered",
                COUNT(*)::int AS "justEatsTotalDeliveries"
            FROM "JustEatsBoxes" j
            LEFT JOIN "Partner" pt ON pt."householdId18" = j."householdId"
            WHERE j."pantryVisitDateTime" >= ${range.start}
              AND j."pantryVisitDateTime" <= ${range.end}
              AND LOWER(TRIM(j."householdName")) = LOWER(TRIM(${orgNameOnly}))
        `;
        return rows[0] ?? { justEatsPoundsDelivered: 0, justEatsTotalDeliveries: 0 };
    }

    const hh = scopeEffectiveHouseholdId18(scope);
    if (hh) {
        const rows = await prisma.$queryRaw<JustEatsStatsRow[]>`
            SELECT
                (
                    COALESCE(
                        SUM(
                            GREATEST(
                                COALESCE(j."numberPickedUp", 1),
                                COALESCE(j."numberDistributed", 1)
                            )
                        ),
                        0
                    ) * 25
                )::float AS "justEatsPoundsDelivered",
                COUNT(*)::int AS "justEatsTotalDeliveries"
            FROM "JustEatsBoxes" j
            LEFT JOIN "Partner" pt ON pt."householdId18" = j."householdId"
            WHERE j."householdId" = ${hh}
              AND j."pantryVisitDateTime" >= ${range.start}
              AND j."pantryVisitDateTime" <= ${range.end}
        `;
        return rows[0] ?? { justEatsPoundsDelivered: 0, justEatsTotalDeliveries: 0 };
    }

    const rows = await prisma.$queryRaw<JustEatsStatsRow[]>`
        SELECT
            (
                COALESCE(
                    SUM(
                        GREATEST(
                            COALESCE(j."numberPickedUp", 1),
                            COALESCE(j."numberDistributed", 1)
                        )
                    ),
                    0
                ) * 25
            )::float AS "justEatsPoundsDelivered",
            COUNT(*)::int AS "justEatsTotalDeliveries"
        FROM "JustEatsBoxes" j
        LEFT JOIN "Partner" pt ON pt."householdId18" = j."householdId"
        WHERE j."pantryVisitDateTime" >= ${range.start}
          AND j."pantryVisitDateTime" <= ${range.end}
          AND TRIM(COALESCE(j."householdName", '')) <> ''
          AND EXISTS (
              SELECT 1
              FROM (
                  SELECT LOWER(TRIM(d2."householdName")) AS org_name
                  FROM "AllProductPackageDestinations" d2
                  WHERE TRIM(COALESCE(d2."householdName", '')) <> ''

                  UNION

                  SELECT LOWER(TRIM(t2."destination")) AS org_name
                  FROM "AllInventoryTransactions" t2
                  WHERE TRIM(COALESCE(t2."destination", '')) <> ''
                    AND LOWER(TRIM(COALESCE(t2."inventoryType", ''))) = 'distribution'
              ) valid_orgs
              WHERE valid_orgs.org_name = LOWER(TRIM(j."householdName"))
          )
    `;
    return rows[0] ?? { justEatsPoundsDelivered: 0, justEatsTotalDeliveries: 0 };
}

/**
 * GET /api/overview/stats?start=...&end=...&destination=...
 * Bulk & rescue: joined destination pipeline plus orphan distribution-only inventory rows (no double count).
 * Just Eats from JustEatsBoxes (25 lb/box).
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(
            searchParams.get('destination'),
            searchParams.get('householdId18')
        );
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();

        const [bulkRescue, justEats] = await Promise.all([
            queryBulkAndRescueStats(range, scope),
            queryJustEatsStats(range, scope),
        ]);

        return NextResponse.json({
            totalPoundsDelivered: Math.round(Number(bulkRescue.totalPoundsDelivered ?? 0)),
            deliveriesCompleted: Number(bulkRescue.deliveriesCompleted ?? 0),
            justEatsPoundsDelivered: Math.round(Number(justEats.justEatsPoundsDelivered ?? 0)),
            justEatsTotalDeliveries: Number(justEats.justEatsTotalDeliveries ?? 0),
        });
    } catch (err: unknown) {
        console.error('Overview stats error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load overview stats' },
            { status: 500 }
        );
    }
}
