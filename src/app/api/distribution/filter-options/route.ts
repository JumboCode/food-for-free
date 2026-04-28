import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeEffectiveHouseholdId18,
    scopeOrganizationNameFilter,
} from '~/lib/overviewAccess';
import { foodTypeLabelForRow } from '~/lib/chartCompositionColors';
import {
    distributionInventoryTypeCondition,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';

type ProductTypeRow = { productType: string | null };

/**
 * GET /api/distribution/filter-options
 * Distinct food types for the current scope (joined pipeline + orphan distribution inventory).
 */
export async function GET(req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const scope = await getOverviewScope(
            searchParams.get('destination'),
            searchParams.get('householdId18')
        );
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const hh = scopeEffectiveHouseholdId18(scope);
        const orgNameOnly = scopeOrganizationNameFilter(scope);
        const destLabel =
            scope.kind === 'partner' || scope.kind === 'admin'
                ? (scope.destination?.trim() ?? '')
                : '';

        const joinedClause = hh
            ? Prisma.sql`WHERE d."householdId18" = ${hh}`
            : orgNameOnly
              ? Prisma.sql`WHERE LOWER(TRIM(COALESCE(pt."organizationName", d."householdName"))) = LOWER(TRIM(${orgNameOnly}))`
              : Prisma.sql``;

        const orphanClause =
            orgNameOnly != null
                ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${orgNameOnly}))`
                : hh && destLabel.length > 0
                  ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))`
                  : hh
                    ? Prisma.sql`AND FALSE`
                    : Prisma.sql``;

        const rows = await prisma.$queryRaw<ProductTypeRow[]>`
            SELECT DISTINCT t."productType" AS "productType"
            FROM (
                SELECT t."productType"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p
                    ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d
                    ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                ${joinedClause}

                UNION

                SELECT t."productType"
                FROM "AllInventoryTransactions" t
                WHERE ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  ${orphanClause}
            ) t
        `;

        const unique = new Set<string>();
        for (const row of rows) {
            unique.add(foodTypeLabelForRow(row.productType).trim());
        }

        return NextResponse.json({
            productTypes: [...unique].sort((a, b) =>
                a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
            ),
        });
    } catch (err: unknown) {
        console.error('Distribution filter-options error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load filter options' },
            { status: 500 }
        );
    }
}
