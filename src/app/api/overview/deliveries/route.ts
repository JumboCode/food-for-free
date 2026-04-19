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

/**
 * GET /api/overview/deliveries?start=...&end=...&destination=...
 * Returns list of deliveries (grouped by date + destination) with id, date, totalPounds, destination.
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

        // Use d.date (pantry visit date/time) as the delivery day source.
        if (partnerHouseholdId18) {
            const scopedDestinationName =
                scope.kind === 'admin' || scope.kind === 'partner' ? scope.destination : undefined;
            type PartnerDeliveryRow = {
                day: string;
                destination: string | null;
                totalPounds: number | null;
            };
            const rows = await prisma.$queryRaw<PartnerDeliveryRow[]>`
                SELECT
                    TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                    COALESCE(MAX(pt."organizationName"), MAX(d."householdName")) AS "destination",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE d."householdId18" = ${partnerHouseholdId18}
                  AND d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                GROUP BY DATE_TRUNC('day', d."date")
                ORDER BY DATE_TRUNC('day', d."date") DESC
                LIMIT 10
            `;
            return NextResponse.json({
                deliveries: rows.map(r => {
                    const day = r.day;
                    const destination =
                        r.destination?.trim() || scopedDestinationName || partnerHouseholdId18;
                    return {
                        id: `${day}|${partnerHouseholdId18}`,
                        date: `${day}T00:00:00.000Z`,
                        totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                        destination,
                        householdId18: partnerHouseholdId18,
                    };
                }),
            });
        }
        type DeliveryRow = {
            day: string;
            destination: string | null;
            totalPounds: number | null;
            householdId18: string | null;
        };
        const rows = await prisma.$queryRaw<DeliveryRow[]>`
            SELECT
                TO_CHAR(DATE_TRUNC('day', d."date"), 'YYYY-MM-DD') AS "day",
                COALESCE(pt."organizationName", d."householdName") AS "destination",
                d."householdId18" AS "householdId18",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalPounds"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
            LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
            WHERE d."date" >= ${range.start}
              AND d."date" <= ${range.end}
            GROUP BY DATE_TRUNC('day', d."date"), d."householdId18", COALESCE(pt."organizationName", d."householdName")

            UNION ALL

            SELECT
                TO_CHAR(DATE_TRUNC('day', t."pantryVisitDateTime"), 'YYYY-MM-DD') AS "day",
                COALESCE(pt."organizationName", t."householdName") AS "destination",
                t."householdId" AS "householdId18",
                COUNT(*) * 25 as "totalPounds"
            FROM "JustEatsBoxes" t
            LEFT JOIN "Partner" pt ON pt."householdId18" = t."householdId"
            WHERE t."pantryVisitDateTime" >= ${range.start}
              AND t."pantryVisitDateTime" <= ${range.end}
            GROUP BY DATE_TRUNC('day', t."pantryVisitDateTime"), t."householdId", COALESCE(pt."organizationName", t."householdName")
            
            ORDER BY "day" DESC
            LIMIT 10
        `;

        return NextResponse.json({
            deliveries: rows.map(r => {
                const day = r.day;
                const destination = r.destination ?? null;
                const householdId18 = r.householdId18 ?? null;
                return {
                    id: `${day}|${householdId18 ?? destination ?? ''}`,
                    date: `${day}T00:00:00.000Z`,
                    totalPounds: Math.round(Number(r.totalPounds ?? 0)),
                    destination,
                    householdId18,
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
