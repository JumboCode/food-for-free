import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerHouseholdId18,
} from '~/lib/overviewAccess';

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

async function queryBulkAndRescueStats(
    range: { start: Date; end: Date },
    partnerHouseholdId18: string | undefined
): Promise<BulkRescueStatsRow> {
    if (partnerHouseholdId18) {
        const rows = await prisma.$queryRaw<BulkRescueStatsRow[]>`
            WITH per_day AS (
                SELECT
                    DATE_TRUNC('day', d."date") AS day_bucket,
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS day_pounds
                FROM "AllProductPackageDestinations" d
                LEFT JOIN "AllPackagesByItem" p
                    ON p."productPackageId18" = d."productPackageId18"
                WHERE d."householdId18" = ${partnerHouseholdId18}
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
        WITH per_delivery AS (
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
        )
        SELECT
            COALESCE(SUM(delivery_pounds) FILTER (WHERE delivery_pounds > 0), 0) AS "totalPoundsDelivered",
            COUNT(*) FILTER (WHERE delivery_pounds > 0)::int AS "deliveriesCompleted"
        FROM per_delivery
    `;
    return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
}

async function queryJustEatsStats(
    range: { start: Date; end: Date },
    partnerHouseholdId18: string | undefined
): Promise<JustEatsStatsRow> {
    if (partnerHouseholdId18) {
        const rows = await prisma.$queryRaw<JustEatsStatsRow[]>`
            SELECT
                (COALESCE(SUM(COALESCE(j."numberDistributed", 1)), 0) * 25)::float AS "justEatsPoundsDelivered",
                COUNT(*)::int AS "justEatsTotalDeliveries"
            FROM "JustEatsBoxes" j
            WHERE j."householdId" = ${partnerHouseholdId18}
              AND j."pantryVisitDateTime" >= ${range.start}
              AND j."pantryVisitDateTime" <= ${range.end}
        `;
        return rows[0] ?? { justEatsPoundsDelivered: 0, justEatsTotalDeliveries: 0 };
    }
    const rows = await prisma.$queryRaw<JustEatsStatsRow[]>`
        SELECT
            (COALESCE(SUM(COALESCE(j."numberDistributed", 1)), 0) * 25)::float AS "justEatsPoundsDelivered",
            COUNT(*)::int AS "justEatsTotalDeliveries"
        FROM "JustEatsBoxes" j
        WHERE j."pantryVisitDateTime" >= ${range.start}
          AND j."pantryVisitDateTime" <= ${range.end}
    `;
    return rows[0] ?? { justEatsPoundsDelivered: 0, justEatsTotalDeliveries: 0 };
}

/**
 * GET /api/overview/stats?start=...&end=...&destination=...
 * Bulk & rescue totals from AllProductPackageDestinations + AllPackagesByItem (zero-pound delivery days/buckets excluded).
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
        const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);

        const [bulkRescue, justEats] = await Promise.all([
            queryBulkAndRescueStats(range, partnerHouseholdId18),
            queryJustEatsStats(range, partnerHouseholdId18),
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
