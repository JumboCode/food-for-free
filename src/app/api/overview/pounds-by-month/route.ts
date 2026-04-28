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

const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

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

function destinationLabel(scope: OverviewScope): string {
    if (scope.kind === 'partner' || scope.kind === 'admin') {
        return scope.destination?.trim() ?? '';
    }
    return '';
}

type DailyRow = { day: string; pounds: number | null };

async function fetchBulkDaily(
    range: { start: Date; end: Date },
    scope: OverviewScope
): Promise<DailyRow[]> {
    const orgNameOnly = scopeOrganizationNameFilter(scope);
    if (orgNameOnly) {
        return prisma.$queryRaw<DailyRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
            FROM "AllProductPackageDestinations" d
            LEFT JOIN "AllPackagesByItem" p ON p."productPackageId18" = d."productPackageId18"
            LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
            WHERE d."date" >= ${range.start}
              AND d."date" <= ${range.end}
              AND LOWER(TRIM(d."householdName")) = LOWER(TRIM(${orgNameOnly}))
            GROUP BY DATE_TRUNC('day', d."date")
            HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
            ORDER BY DATE_TRUNC('day', d."date") ASC
        `;
    }

    const hh = scopeEffectiveHouseholdId18(scope);
    if (hh) {
        return prisma.$queryRaw<DailyRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
            FROM "AllProductPackageDestinations" d
            LEFT JOIN "AllPackagesByItem" p ON p."productPackageId18" = d."productPackageId18"
            WHERE d."householdId18" = ${hh}
              AND d."date" >= ${range.start}
              AND d."date" <= ${range.end}
            GROUP BY DATE_TRUNC('day', d."date")
            HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
            ORDER BY DATE_TRUNC('day', d."date") ASC
        `;
    }

    return prisma.$queryRaw<DailyRow[]>`
        SELECT
            TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
            SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
        FROM "AllProductPackageDestinations" d
        LEFT JOIN "AllPackagesByItem" p ON p."productPackageId18" = d."productPackageId18"
        WHERE d."date" >= ${range.start}
          AND d."date" <= ${range.end}
        GROUP BY DATE_TRUNC('day', d."date")
        HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
        ORDER BY DATE_TRUNC('day', d."date") ASC
    `;
}

async function fetchOrphanDaily(
    range: { start: Date; end: Date },
    scope: OverviewScope
): Promise<DailyRow[]> {
    const orgNameOnly = scopeOrganizationNameFilter(scope);
    if (orgNameOnly) {
        return prisma.$queryRaw<DailyRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', t."date"), 'YYYY-MM-DD') AS "day",
                SUM(${inventoryTxPoundsSql()}) AS "pounds"
            FROM "AllInventoryTransactions" t
            WHERE t."date" >= ${range.start}
              AND t."date" <= ${range.end}
              AND ${distributionInventoryTypeCondition}
              AND ${orphanInventoryCondition}
              AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${orgNameOnly}))
            GROUP BY DATE_TRUNC('day', t."date")
            HAVING SUM(${inventoryTxPoundsSql()}) > 0
            ORDER BY DATE_TRUNC('day', t."date") ASC
        `;
    }

    const hh = scopeEffectiveHouseholdId18(scope);
    const destLabel = destinationLabel(scope);
    if (hh && destLabel.length > 0) {
        return prisma.$queryRaw<DailyRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', t."date"), 'YYYY-MM-DD') AS "day",
                SUM(${inventoryTxPoundsSql()}) AS "pounds"
            FROM "AllInventoryTransactions" t
            WHERE t."date" >= ${range.start}
              AND t."date" <= ${range.end}
              AND ${distributionInventoryTypeCondition}
              AND ${orphanInventoryCondition}
              AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))
            GROUP BY DATE_TRUNC('day', t."date")
            HAVING SUM(${inventoryTxPoundsSql()}) > 0
            ORDER BY DATE_TRUNC('day', t."date") ASC
        `;
    }
    if (hh) {
        return [];
    }

    return prisma.$queryRaw<DailyRow[]>`
        SELECT
            TO_CHAR(DATE_TRUNC('day', t."date"), 'YYYY-MM-DD') AS "day",
            SUM(${inventoryTxPoundsSql()}) AS "pounds"
        FROM "AllInventoryTransactions" t
        WHERE t."date" >= ${range.start}
          AND t."date" <= ${range.end}
          AND ${distributionInventoryTypeCondition}
          AND ${orphanInventoryCondition}
          AND TRIM(COALESCE(t."destination", '')) <> ''
        GROUP BY DATE_TRUNC('day', t."date")
        HAVING SUM(${inventoryTxPoundsSql()}) > 0
        ORDER BY DATE_TRUNC('day', t."date") ASC
    `;
}

async function fetchJustEatsDaily(
    range: { start: Date; end: Date },
    scope: OverviewScope
): Promise<DailyRow[]> {
    const orgNameOnly = scopeOrganizationNameFilter(scope);
    if (orgNameOnly) {
        return prisma.$queryRaw<DailyRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', j."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
                (
                    SUM(
                        GREATEST(
                            COALESCE(j."numberPickedUp", 1),
                            COALESCE(j."numberDistributed", 1)
                        )
                    ) * 25
                ) AS "pounds"
            FROM "JustEatsBoxes" j
            LEFT JOIN "Partner" pt ON pt."householdId18" = j."householdId"
            WHERE j."pantryVisitDateTime" >= ${range.start}
              AND j."pantryVisitDateTime" <= ${range.end}
              AND LOWER(TRIM(j."householdName")) = LOWER(TRIM(${orgNameOnly}))
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
            GROUP BY DATE_TRUNC('day', j."pantryVisitDateTime")
            ORDER BY DATE_TRUNC('day', j."pantryVisitDateTime") ASC
        `;
    }

    const hh = scopeEffectiveHouseholdId18(scope);
    if (hh) {
        return prisma.$queryRaw<DailyRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', d."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
                (
                    SUM(
                        GREATEST(
                            COALESCE(d."numberPickedUp", 1),
                            COALESCE(d."numberDistributed", 1)
                        )
                    ) * 25
                ) AS "pounds"
            FROM "JustEatsBoxes" d
            LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId"
            WHERE d."householdId" = ${hh}
              AND d."pantryVisitDateTime" >= ${range.start}
              AND d."pantryVisitDateTime" <= ${range.end}
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
                  WHERE valid_orgs.org_name = LOWER(TRIM(d."householdName"))
              )
            GROUP BY DATE_TRUNC('day', d."pantryVisitDateTime")
            ORDER BY DATE_TRUNC('day', d."pantryVisitDateTime") ASC
        `;
    }

    return prisma.$queryRaw<DailyRow[]>`
        SELECT
            TO_CHAR(DATE_TRUNC('day', d."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
            (
                SUM(
                    GREATEST(
                        COALESCE(d."numberPickedUp", 1),
                        COALESCE(d."numberDistributed", 1)
                    )
                ) * 25
            ) AS "pounds"
        FROM "JustEatsBoxes" d
        LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId"
        WHERE d."pantryVisitDateTime" >= ${range.start}
          AND d."pantryVisitDateTime" <= ${range.end}
          AND TRIM(COALESCE(d."householdName", '')) <> ''
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
              WHERE valid_orgs.org_name = LOWER(TRIM(d."householdName"))
          )
        GROUP BY DATE_TRUNC('day', d."pantryVisitDateTime")
        ORDER BY DATE_TRUNC('day', d."pantryVisitDateTime") ASC
    `;
}

function mergeDailyByDay(rows: DailyRow[]): DailyRow[] {
    const map = new Map<string, number>();
    for (const r of rows) {
        const v = Number(r.pounds ?? 0);
        map.set(r.day, (map.get(r.day) ?? 0) + v);
    }
    return [...map.entries()].map(([day, pounds]) => ({ day, pounds }));
}

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

        const [bulkJoined, orphanDaily, justEatsDailyRows] = await Promise.all([
            fetchBulkDaily(range, scope),
            fetchOrphanDaily(range, scope),
            fetchJustEatsDaily(range, scope),
        ]);

        const dailyRows = mergeDailyByDay([...bulkJoined, ...orphanDaily]);

        const daysDiff = Math.ceil(
            (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsDiff =
            range.end.getFullYear() -
            range.start.getFullYear() +
            (range.end.getMonth() - range.start.getMonth()) / 12;
        const aggregateByYear = yearsDiff > 1;
        const aggregateByDay = daysDiff <= 30 && !aggregateByYear;

        const buckets: Record<string, number> = {};

        for (const row of dailyRows) {
            const [yearStr, monthStr, dayStr] = row.day.split('-');
            const y = Number.parseInt(yearStr ?? '', 10);
            const m = Number.parseInt(monthStr ?? '', 10);
            const day = Number.parseInt(dayStr ?? '', 10);
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) continue;
            const weight = Number(row.pounds ?? 0);
            let key: string;
            if (aggregateByYear) {
                key = String(y);
            } else if (aggregateByDay) {
                key = `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            } else {
                key = `${MONTH_NAMES[m - 1]} ${y}`;
            }
            buckets[key] = (buckets[key] ?? 0) + weight;
        }

        for (const row of justEatsDailyRows) {
            const [yearStr, monthStr, dayStr] = row.day.split('-');
            const y = Number.parseInt(yearStr ?? '', 10);
            const m = Number.parseInt(monthStr ?? '', 10);
            const day = Number.parseInt(dayStr ?? '', 10);
            if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(day)) continue;
            const weight = Number(row.pounds ?? 0);
            let key: string;
            if (aggregateByYear) {
                key = String(y);
            } else if (aggregateByDay) {
                key = `${String(m).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
            } else {
                key = `${MONTH_NAMES[m - 1]} ${y}`;
            }
            buckets[key] = (buckets[key] ?? 0) + weight;
        }

        type Period = { month: string; order: number };
        const periodsInRange: Period[] = [];

        if (aggregateByYear) {
            const yearsWithData = Object.keys(buckets)
                .filter(k => /^\d{4}$/.test(k))
                .map(y => parseInt(y, 10))
                .sort((a, b) => a - b);
            for (const y of yearsWithData) {
                periodsInRange.push({ month: String(y), order: y });
            }
        } else if (aggregateByDay) {
            const cursor = new Date(range.start);
            cursor.setHours(0, 0, 0, 0);
            const end = new Date(range.end);
            end.setHours(0, 0, 0, 0);
            let order = 0;
            while (cursor.getTime() <= end.getTime()) {
                const key = `${String(cursor.getMonth() + 1).padStart(2, '0')}/${String(cursor.getDate()).padStart(2, '0')}`;
                periodsInRange.push({ month: key, order: order++ });
                cursor.setDate(cursor.getDate() + 1);
            }
        } else {
            const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
            const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
            let order = 0;
            while (cursor.getTime() <= end.getTime()) {
                const key = `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
                periodsInRange.push({ month: key, order: order++ });
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }

        const chartData = periodsInRange.map(({ month }) => ({
            month,
            pounds: Math.round(buckets[month] ?? 0),
        }));

        return NextResponse.json(chartData);
    } catch (err: unknown) {
        console.error('Pounds-by-month error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load pounds by month' },
            { status: 500 }
        );
    }
}
