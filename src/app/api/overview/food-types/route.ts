import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '~/lib/prisma';
import {
    COMPOSITION_EMPTY_SEGMENT_COLOR,
    PROCESSING_OVERVIEW_COLOR_BY_LABEL,
    foodTypeFixedHex,
    type FoodTypeCompositionEntry,
} from '~/lib/chartCompositionColors';
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
        const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);
        const destination = scopeToPartnerFilter(scope);

        const partnerClause = partnerHouseholdId18
            ? Prisma.sql`AND d."householdId18" = ${partnerHouseholdId18}`
            : destination
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

        const foodTypes: FoodTypeCompositionEntry[] = foodTypeGrouped
            .map(row => ({
                label: row.productType?.trim() || 'Other',
                value: Math.round(Number(row.pounds ?? 0)),
                color: foodTypeFixedHex(row.productType?.trim() || 'Other'),
            }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);

        const processing: FoodTypeCompositionEntry[] = processingGrouped
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
                    color: PROCESSING_OVERVIEW_COLOR_BY_LABEL[label],
                };
            })
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);

        if (foodTypes.length === 0) {
            foodTypes.push({
                label: 'No data',
                value: 0,
                color: COMPOSITION_EMPTY_SEGMENT_COLOR,
            });
        }
        if (processing.length === 0) {
            processing.push({
                label: 'No data',
                value: 0,
                color: COMPOSITION_EMPTY_SEGMENT_COLOR,
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
