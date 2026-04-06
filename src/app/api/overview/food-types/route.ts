import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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
 * GET /api/overview/food-types?start=...&end=...&destination=...
 * Returns composition (lbs) by product type and minimally processed flag.
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(searchParams.get('destination'));
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const destination = scopeToPartnerFilter(scope);

        const partnerClause = destination
            ? Prisma.sql`AND d."householdName" ILIKE ${destination}`
            : Prisma.empty;

        type ProductTypeRow = { productType: string | null; pounds: number | null };
        const foodTypeGrouped = await prisma.$queryRaw<ProductTypeRow[]>`
            SELECT
                t."productType" AS "productType",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p
                ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d
                ON d."productPackageId18" = p."productPackageId18"
            WHERE t."date" >= ${range.start}
              AND t."date" <= ${range.end}
              ${partnerClause}
            GROUP BY t."productType"
        `;

        type ProcessingRow = { minimallyProcessedFood: boolean | null; pounds: number | null };
        const processingGrouped = await prisma.$queryRaw<ProcessingRow[]>`
            SELECT
                t."minimallyProcessedFood" AS "minimallyProcessedFood",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p
                ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d
                ON d."productPackageId18" = p."productPackageId18"
            WHERE t."date" >= ${range.start}
              AND t."date" <= ${range.end}
              ${partnerClause}
            GROUP BY t."minimallyProcessedFood"
        `;

        const foodTypeColors = ['#B7D7BD', '#6CAEE6', '#F9DC70', '#E7A54E', '#F4A6B8', '#B39DDB'];
        const processingColorMap: Record<string, string> = {
            'Minimally Processed': '#B7D7BD',
            Processed: '#E7A54E',
            'Not Specified': '#CBD5E1',
        };

        const foodTypes = foodTypeGrouped
            .map((row, index) => ({
                label: row.productType?.trim() || 'Other',
                value: Math.round(Number(row.pounds ?? 0)),
                color: foodTypeColors[index % foodTypeColors.length],
            }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);

        const processing = processingGrouped
            .map(row => {
                const label =
                    row.minimallyProcessedFood === true
                        ? 'Minimally Processed'
                        : row.minimallyProcessedFood === false
                          ? 'Processed'
                          : 'Not Specified';
                return {
                    label,
                    value: Math.round(Number(row.pounds ?? 0)),
                    color: processingColorMap[label],
                };
            })
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);

        if (foodTypes.length === 0) {
            foodTypes.push({
                label: 'No data',
                value: 0,
                color: '#CBD5E1',
            });
        }
        if (processing.length === 0) {
            processing.push({
                label: 'No data',
                value: 0,
                color: '#CBD5E1',
            });
        }

        return NextResponse.json({
            foodTypes,
            processing,
        });
    } catch (err: unknown) {
        console.error('Overview food-types error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load food types' },
            { status: 500 }
        );
    }
}
