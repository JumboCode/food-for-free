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
        const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);
        const partnerFilter = scopeToPartnerFilter(scope);

        // Use d.date (pantry visit date/time) as the delivery day source.
        if (partnerHouseholdId18) {
            type PartnerDeliveryRow = { day: string; totalPounds: number | null };
            const rows = await prisma.$queryRaw<PartnerDeliveryRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                WHERE d."householdId18" = ${partnerHouseholdId18}
                  AND d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date")
                ORDER BY DATE_TRUNC('day', d."date") DESC
                LIMIT 10
            `;

            const destLabel = partnerFilter ?? partnerHouseholdId18;
            return NextResponse.json({
                deliveries: rows.map(r => {
                    const day = r.day;
                    return {
                        id: `${day}|${destLabel}`,
                        date: `${day}T00:00:00.000Z`,
                        totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                        destination: destLabel,
                    };
                }),
            });
        }
        if (partnerFilter) {
            type AdminScopedDeliveryRow = { day: string; totalPounds: number | null };
            const rows = await prisma.$queryRaw<AdminScopedDeliveryRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                WHERE d."householdName" ILIKE ${partnerFilter}
                  AND d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date")
                ORDER BY DATE_TRUNC('day', d."date") DESC
                LIMIT 10
            `;

            return NextResponse.json({
                deliveries: rows.map(r => {
                    const day = r.day;
                    return {
                        id: `${day}|${partnerFilter}`,
                        date: `${day}T00:00:00.000Z`,
                        totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                        destination: partnerFilter,
                    };
                }),
            });
        }
        type DeliveryRow = { day: string; destination: string | null; totalPounds: number | null };
        const rows = await prisma.$queryRaw<DeliveryRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                d."householdName" AS "destination",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
            WHERE d."date" >= ${range.start}
              AND d."date" <= ${range.end}
            GROUP BY DATE_TRUNC('day', d."date"), d."householdName"
            ORDER BY DATE_TRUNC('day', d."date") DESC
            LIMIT 10
        `;

        return NextResponse.json({
            deliveries: rows.map(r => {
                const day = r.day;
                const destination = r.destination ?? null;
                return {
                    id: `${day}|${destination ?? ''}`,
                    date: `${day}T00:00:00.000Z`,
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
