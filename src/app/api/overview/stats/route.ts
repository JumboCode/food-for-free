import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerFilter,
    scopeToPartnerHouseholdId18,
} from '~/lib/overviewAccess';

function parseDateRange(searchParams: URLSearchParams): { start: Date; end: Date } | null {
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (!startParam || !endParam) return null;
    const start = new Date(startParam);
    const end = new Date(endParam);
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

type LegacyStatsRow = {
    totalPoundsDelivered: number | null;
    deliveriesCompleted: number;
};

type JustEatsStatsRow = {
    justEatsPoundsDelivered: number | null;
    justEatsTotalDeliveries: number;
};

async function queryLegacyStats(
    range: { start: Date; end: Date },
    partnerHouseholdId18: string | undefined,
    partnerFilter: string | undefined
): Promise<LegacyStatsRow> {
    if (partnerHouseholdId18) {
        const rows = await prisma.$queryRaw<LegacyStatsRow[]>`
            SELECT
                COALESCE(SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)), 0) AS "totalPoundsDelivered",
                COUNT(DISTINCT DATE_TRUNC('day', d."date"))::int AS "deliveriesCompleted"
            FROM "AllProductPackageDestinations" d
            LEFT JOIN "AllPackagesByItem" p
                ON p."productPackageId18" = d."productPackageId18"
            WHERE d."householdId18" = ${partnerHouseholdId18}
              AND d."date" >= ${range.start}
              AND d."date" <= ${range.end}
        `;
        return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
    }
    if (partnerFilter) {
        const rows = await prisma.$queryRaw<LegacyStatsRow[]>`
            SELECT
                COALESCE(SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)), 0) AS "totalPoundsDelivered",
                COUNT(DISTINCT DATE_TRUNC('day', d."date"))::int AS "deliveriesCompleted"
            FROM "AllProductPackageDestinations" d
            LEFT JOIN "AllPackagesByItem" p
                ON p."productPackageId18" = d."productPackageId18"
            WHERE d."date" >= ${range.start}
              AND d."date" <= ${range.end}
              AND (
                  d."householdName" ILIKE ${partnerFilter}
                  OR d."householdId18" IN (
                      SELECT pt."householdId18" FROM "Partner" pt
                      WHERE pt."organizationName" ILIKE ${partnerFilter}
                  )
              )
        `;
        return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
    }
    const rows = await prisma.$queryRaw<LegacyStatsRow[]>`
        SELECT
            COALESCE(SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)), 0) AS "totalPoundsDelivered",
            COUNT(DISTINCT (DATE_TRUNC('day', d."date"), d."householdId18"))::int AS "deliveriesCompleted"
        FROM "AllProductPackageDestinations" d
        LEFT JOIN "AllPackagesByItem" p
            ON p."productPackageId18" = d."productPackageId18"
        WHERE d."date" >= ${range.start}
          AND d."date" <= ${range.end}
    `;
    return rows[0] ?? { totalPoundsDelivered: 0, deliveriesCompleted: 0 };
}

async function queryJustEatsStats(
    range: { start: Date; end: Date },
    partnerHouseholdId18: string | undefined,
    partnerFilter: string | undefined
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
    if (partnerFilter) {
        const rows = await prisma.$queryRaw<JustEatsStatsRow[]>`
            SELECT
                (COALESCE(SUM(COALESCE(j."numberDistributed", 1)), 0) * 25)::float AS "justEatsPoundsDelivered",
                COUNT(*)::int AS "justEatsTotalDeliveries"
            FROM "JustEatsBoxes" j
            WHERE j."pantryVisitDateTime" >= ${range.start}
              AND j."pantryVisitDateTime" <= ${range.end}
              AND (
                  j."householdId" IN (
                      SELECT p."householdId18" FROM "Partner" p
                      WHERE p."organizationName" ILIKE ${partnerFilter}
                  )
                  OR j."householdName" ILIKE ${partnerFilter}
              )
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
 * Legacy totals from AllProductPackageDestinations + AllPackagesByItem; Just Eats from JustEatsBoxes (25 lb/box).
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(searchParams.get('destination'));
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);
        const partnerFilter = scopeToPartnerFilter(scope);

        const [legacy, justEats] = await Promise.all([
            queryLegacyStats(range, partnerHouseholdId18, partnerFilter),
            queryJustEatsStats(range, partnerHouseholdId18, partnerFilter),
        ]);

        return NextResponse.json({
            totalPoundsDelivered: Math.round(Number(legacy.totalPoundsDelivered ?? 0)),
            deliveriesCompleted: Number(legacy.deliveriesCompleted ?? 0),
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
