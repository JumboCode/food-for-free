import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerFilter,
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
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    return { start, end };
}

/**
 * GET /api/overview/stats?start=...&end=...&destination=...
 * Returns totalPoundsDelivered and deliveriesCompleted (distinct date+destination) in range.
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(searchParams.get('destination'));
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const partnerFilter = scopeToPartnerFilter(scope);

        if (partnerFilter) {
            type PartnerStatsRow = {
                totalPoundsDelivered: number | null;
                deliveriesCompleted: number;
            };
            const rows = await prisma.$queryRaw<PartnerStatsRow[]>`
                SELECT
                    COALESCE(SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)), 0) AS "totalPoundsDelivered",
                    COUNT(DISTINCT DATE_TRUNC('day', d."date"))::int AS "deliveriesCompleted"
                FROM "AllProductPackageDestinations" d
                LEFT JOIN "AllPackagesByItem" p
                    ON p."productPackageId18" = d."productPackageId18"
                WHERE d."householdName" ILIKE ${partnerFilter}
                  AND d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
            `;
            const stats = rows[0];

            return NextResponse.json({
                totalPoundsDelivered: Math.round(Number(stats?.totalPoundsDelivered ?? 0)),
                deliveriesCompleted: Number(stats?.deliveriesCompleted ?? 0),
            });
        }
        type OverallStatsRow = { totalPoundsDelivered: number | null; deliveriesCompleted: number };
        const rows = await prisma.$queryRaw<OverallStatsRow[]>`
            SELECT
                COALESCE(SUM(COALESCE("weightLbs", 0)), 0) AS "totalPoundsDelivered",
                COUNT(DISTINCT (DATE_TRUNC('day', "date"), COALESCE("destination", '')))::int AS "deliveriesCompleted"
            FROM "AllInventoryTransactions"
            WHERE "date" >= ${range.start}
              AND "date" <= ${range.end}
              AND "destination" IS NOT NULL
              AND BTRIM("destination") <> ''
        `;
        const stats = rows[0];

        return NextResponse.json({
            totalPoundsDelivered: Math.round(Number(stats?.totalPoundsDelivered ?? 0)),
            deliveriesCompleted: Number(stats?.deliveriesCompleted ?? 0),
        });
    } catch (err: unknown) {
        console.error('Overview stats error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load overview stats' },
            { status: 500 }
        );
    }
}
