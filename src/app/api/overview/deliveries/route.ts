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

/**
 * GET /api/overview/deliveries?start=...&end=...&destination=...
 * Bulk & rescue rows only: grouped by date (and destination in the global view), excluding zero-pound totals.
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
                HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
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
            const rows = partnerHouseholdId18
                ? await prisma.$queryRaw<AdminScopedDeliveryRow[]>`
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
                    HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
                    ORDER BY DATE_TRUNC('day', d."date") DESC
                    LIMIT 10
                `
                : await prisma.$queryRaw<AdminScopedDeliveryRow[]>`
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
                    HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
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
                COALESCE(pt."organizationName", d."householdName") AS "destination",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
            LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
            WHERE d."date" >= ${range.start}
              AND d."date" <= ${range.end}
            GROUP BY DATE_TRUNC('day', d."date"), COALESCE(pt."organizationName", d."householdName")
            HAVING SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) > 0
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
