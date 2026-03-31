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
 * GET /api/overview/deliveries?start=...&end=...&destination=...
 * Returns list of deliveries (grouped by date + destination) with id, date, totalPounds, destination.
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
            type PartnerDeliveryRow = { day: Date; totalPounds: number | null };
            const rows = await prisma.$queryRaw<PartnerDeliveryRow[]>`
                SELECT
                    DATE_TRUNC('day', d."date") AS "day",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
                FROM "AllProductPackageDestinations" d
                LEFT JOIN "AllPackagesByItem" p
                    ON p."productPackageId18" = d."productPackageId18"
                WHERE d."householdName" ILIKE ${partnerFilter}
                  AND d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date")
                ORDER BY DATE_TRUNC('day', d."date") DESC
                LIMIT 10
            `;

            return NextResponse.json({
                deliveries: rows.map(r => {
                    const day = new Date(r.day).toISOString().slice(0, 10);
                    return {
                        id: `${day}|${partnerFilter}`,
                        date: new Date(r.day).toISOString(),
                        totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                        destination: partnerFilter,
                    };
                }),
            });
        }
        type DeliveryRow = { day: Date; destination: string | null; totalPounds: number | null };
        const rows = await prisma.$queryRaw<DeliveryRow[]>`
            SELECT
                DATE_TRUNC('day', "date") AS "day",
                "destination" AS "destination",
                SUM(COALESCE("weightLbs", 0)) AS "totalPounds"
            FROM "AllInventoryTransactions"
            WHERE "date" >= ${range.start}
              AND "date" <= ${range.end}
            GROUP BY DATE_TRUNC('day', "date"), "destination"
            ORDER BY DATE_TRUNC('day', "date") DESC
            LIMIT 10
        `;

        return NextResponse.json({
            deliveries: rows.map(r => {
                const day = new Date(r.day).toISOString().slice(0, 10);
                const destination = r.destination ?? null;
                return {
                    id: `${day}|${destination ?? ''}`,
                    date: new Date(r.day).toISOString(),
                    totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                    destination,
                };
            }),
        });
    } catch (err: unknown) {
        console.error('Overview deliveries error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load deliveries' },
            { status: 500 }
        );
    }
}
