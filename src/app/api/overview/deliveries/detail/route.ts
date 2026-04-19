import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '~/lib/prisma';
import { getOverviewScope, overviewScopeErrorResponse } from '~/lib/overviewAccess';

type FoodRow = { productName: string | null; totalWeightLbs: number | null };

type TagRow = { productType: string | null; minimallyProcessedFood: boolean | null };

function buildNutritionalTags(rows: TagRow[]): string[] {
    const types = new Set<string>();
    let anyTrue = false;
    let anyFalse = false;
    for (const r of rows) {
        const pt = r.productType?.trim();
        if (pt) types.add(pt);
        if (r.minimallyProcessedFood === true) anyTrue = true;
        if (r.minimallyProcessedFood === false) anyFalse = true;
    }
    const tags = [...types].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    // Omit "Mixed processing" for this view; when both apply, show no aggregate processing tag.
    if (anyTrue && !anyFalse) tags.push('Minimally processed');
    else if (!anyTrue && anyFalse) tags.push('Processed');
    else if (rows.length > 0 && !anyTrue && !anyFalse) tags.push('Not specified');
    return tags;
}

/**
 * GET /api/overview/deliveries/detail?date=YYYY-MM-DD&org=OrgName
 * Returns itemized foods delivered for a specific date + organization.
 * Admin: any org. Partner: only their own org.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const org = searchParams.get('org')?.trim() ?? '';
    const householdId18Param = searchParams.get('householdId18')?.trim() ?? '';

    if (!dateParam) {
        return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const scope = await getOverviewScope(null, householdId18Param);
    const scopeErr = overviewScopeErrorResponse(scope);
    if (scopeErr) return scopeErr;

    if (scope.kind === 'admin' && !householdId18Param) {
        return NextResponse.json({ error: 'Missing householdId18 parameter' }, { status: 400 });
    }

    // Partners can only view their own org's data
    if (
        scope.kind === 'partner' &&
        householdId18Param &&
        scope.partnerHouseholdId18 !== householdId18Param
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const destinationPredicate =
            scope.kind === 'partner'
                ? Prisma.sql`d."householdId18" = ${scope.partnerHouseholdId18}`
                : householdId18Param
                  ? Prisma.sql`d."householdId18" = ${householdId18Param}`
                  : Prisma.empty;

        const justEatsHouseholdPredicate =
            scope.kind === 'partner'
                ? Prisma.sql`t."householdId" = ${scope.partnerHouseholdId18}`
                : householdId18Param
                  ? Prisma.sql`t."householdId" = ${householdId18Param}`
                  : Prisma.empty;

        // Use pantry visit date (d.date) to match overview delivery day grouping.
        const foodRows = await prisma.$queryRaw<FoodRow[]>`
            SELECT
                COALESCE(p."pantryProductName", 'Unknown') AS "productName",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalWeightLbs"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
            WHERE DATE_TRUNC('day', d."date") = DATE_TRUNC('day', ${date})
              AND ${destinationPredicate}
            GROUP BY p."pantryProductName"

            UNION ALL 

            SELECT
                COALESCE(t."productPackageName", 'Unknown') AS "productName",
                COUNT(*) * 25 AS "totalWeightLbs"
            FROM "JustEatsBoxes" t
            WHERE DATE_TRUNC('day', t."pantryVisitDateTime") = DATE_TRUNC('day', ${date})
              AND ${justEatsHouseholdPredicate}
            GROUP BY t."productPackageName"

            ORDER BY "totalWeightLbs" DESC
        `;

        const totalPounds = foodRows.reduce((sum, r) => sum + Number(r.totalWeightLbs ?? 0), 0);

        const tagRows = await prisma.$queryRaw<TagRow[]>`
            SELECT DISTINCT t."productType", t."minimallyProcessedFood"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
            WHERE DATE_TRUNC('day', d."date") = DATE_TRUNC('day', ${date})
              AND ${destinationPredicate}
        `;

        const nutritionalTags = buildNutritionalTags(tagRows);

        return NextResponse.json({
            date: date.toISOString().slice(0, 10),
            organizationName:
                org || (scope.kind === 'partner' ? scope.destination : 'Selected Organization'),
            totalPounds: Math.round(totalPounds),
            nutritionalTags,
            foodsDelivered: foodRows
                .filter(r => r.productName)
                .map(r => ({
                    name: r.productName!,
                    weight: `${Math.round(Number(r.totalWeightLbs ?? 0)).toLocaleString()} lbs`,
                })),
        });
    } catch (err: unknown) {
        console.error('Delivery detail error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load delivery detail' },
            { status: 500 }
        );
    }
}
