import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerHouseholdId18,
} from '~/lib/overviewAccess';
import { foodTypeLabelForRow } from '~/lib/chartCompositionColors';

type ProductTypeRow = { productType: string | null };

/**
 * GET /api/distribution/filter-options
 * Returns distinct food type filter options for current viewer scope.
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

        const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);

        const rows = partnerHouseholdId18
            ? await prisma.$queryRaw<ProductTypeRow[]>`
                SELECT DISTINCT t."productType" AS "productType"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p
                    ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d
                    ON d."productPackageId18" = p."productPackageId18"
                WHERE d."householdId18" = ${partnerHouseholdId18}
            `
            : await prisma.$queryRaw<ProductTypeRow[]>`
                SELECT DISTINCT t."productType" AS "productType"
                FROM "AllInventoryTransactions" t
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
