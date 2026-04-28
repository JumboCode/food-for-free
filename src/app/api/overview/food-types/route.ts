import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '~/lib/prisma';
import type { OverviewScope } from '~/lib/overviewAccess';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeEffectiveHouseholdId18,
    scopeOrganizationNameFilter,
} from '~/lib/overviewAccess';
import {
    COMPOSITION_EMPTY_SEGMENT_COLOR,
    PROCESSING_OVERVIEW_COLOR_BY_LABEL,
    foodTypeFixedHex,
    type FoodTypeCompositionEntry,
} from '~/lib/chartCompositionColors';
import {
    destinationStatusIncludedCondition,
    distributionInventoryTypeCondition,
    inventoryTxPoundsSql,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';

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

/**
 * GET /api/overview/food-types?start=...&end=...&destination=...
 * Composition for bulk & recovery includes orphan distribution-only inventory rows.
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
        const partnerHouseholdId18 = scopeEffectiveHouseholdId18(scope);
        const orgNameOnly = scopeOrganizationNameFilter(scope);
        const destLabel = destinationLabel(scope);

        const joinedPartnerClause = partnerHouseholdId18
            ? Prisma.sql`AND d."householdId18" = ${partnerHouseholdId18}`
            : Prisma.empty;

        const joinedNameClause = orgNameOnly
            ? Prisma.sql`AND LOWER(TRIM(COALESCE(pt."organizationName", d."householdName"))) = LOWER(TRIM(${orgNameOnly}))`
            : Prisma.empty;

        const orphanDisabled = Boolean(partnerHouseholdId18) && destLabel.length === 0;
        const orphanScopeClause = orphanDisabled
            ? Prisma.sql`AND FALSE`
            : orgNameOnly != null
              ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${orgNameOnly}))`
              : partnerHouseholdId18 && destLabel.length > 0
                ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))`
                : Prisma.empty;

        type ProductTypeRow = { productType: string | null; pounds: number | null };
        const foodTypeGrouped = await prisma.$queryRaw<ProductTypeRow[]>`
            SELECT "productType", SUM("pounds") AS "pounds" FROM (
                SELECT
                    t."productType" AS "productType",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p
                    ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d
                    ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                  AND ${destinationStatusIncludedCondition}
                  ${joinedPartnerClause}
                  ${joinedNameClause}
                GROUP BY t."productType"

                UNION ALL

                SELECT
                    t."productType" AS "productType",
                    SUM(${inventoryTxPoundsSql()}) AS "pounds"
                FROM "AllInventoryTransactions" t
                WHERE t."date" >= ${range.start}
                  AND t."date" <= ${range.end}
                  AND ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  ${orphanScopeClause}
                GROUP BY t."productType"
            ) sub
            GROUP BY "productType"
        `;

        type ProcessingRow = { minimallyProcessedFood: boolean | null; pounds: number | null };
        const processingGrouped = await prisma.$queryRaw<ProcessingRow[]>`
            SELECT "minimallyProcessedFood", SUM("pounds") AS "pounds" FROM (
                SELECT
                    t."minimallyProcessedFood" AS "minimallyProcessedFood",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "pounds"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p
                    ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d
                    ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE d."date" >= ${range.start}
                  AND d."date" <= ${range.end}
                  AND ${destinationStatusIncludedCondition}
                  ${joinedPartnerClause}
                  ${joinedNameClause}
                GROUP BY t."minimallyProcessedFood"

                UNION ALL

                SELECT
                    t."minimallyProcessedFood" AS "minimallyProcessedFood",
                    SUM(${inventoryTxPoundsSql()}) AS "pounds"
                FROM "AllInventoryTransactions" t
                WHERE t."date" >= ${range.start}
                  AND t."date" <= ${range.end}
                  AND ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  ${orphanScopeClause}
                GROUP BY t."minimallyProcessedFood"
            ) sub
            GROUP BY "minimallyProcessedFood"
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
