import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeEffectiveHouseholdId18,
    scopeOrganizationNameFilter,
} from '~/lib/overviewAccess';
import {
    distributionInventoryTypeCondition,
    inventoryTxPoundsSql,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';

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
    if (anyTrue && !anyFalse) tags.push('Minimally processed');
    else if (!anyTrue && anyFalse) tags.push('Processed');
    else if (rows.length > 0 && !anyTrue && !anyFalse) tags.push('Not specified');
    return tags;
}

function mergeFoodMaps(maps: Map<string, number>[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const m of maps) {
        for (const [k, v] of m) {
            out.set(k, (out.get(k) ?? 0) + v);
        }
    }
    return out;
}

function rowsToMap(rows: FoodRow[]): Map<string, number> {
    const m = new Map<string, number>();
    for (const r of rows) {
        const name = r.productName?.trim() || 'Unknown';
        m.set(name, (m.get(name) ?? 0) + Number(r.totalWeightLbs ?? 0));
    }
    return m;
}

/**
 * GET /api/overview/deliveries/detail?date=YYYY-MM-DD&org=OrgName&householdId18=&destination=
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const org = searchParams.get('org')?.trim() ?? '';
    const householdId18Param = searchParams.get('householdId18')?.trim() ?? '';
    const destinationParam =
        searchParams.get('destination')?.trim() ?? searchParams.get('org')?.trim() ?? '';

    if (!dateParam) {
        return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const scope = await getOverviewScope(destinationParam || null, householdId18Param || null);
    const scopeErr = overviewScopeErrorResponse(scope);
    if (scopeErr) return scopeErr;

    if (scope.kind === 'admin' && !householdId18Param && !(destinationParam || org)) {
        return NextResponse.json(
            { error: 'Missing householdId18 or destination parameter' },
            { status: 400 }
        );
    }

    if (
        scope.kind === 'partner' &&
        householdId18Param &&
        scope.partnerHouseholdId18 !== householdId18Param
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (
        scope.kind === 'partner' &&
        !householdId18Param &&
        destinationParam &&
        scope.destination?.trim().toLowerCase() !== destinationParam.trim().toLowerCase()
    ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const hh = scopeEffectiveHouseholdId18(scope);
        const orgNameOnly = scopeOrganizationNameFilter(scope);
        const destLabel = (destinationParam || org).trim();

        const joinedPartnerPredicate = hh
            ? Prisma.sql`d."householdId18" = ${hh}`
            : orgNameOnly
              ? Prisma.sql`LOWER(TRIM(COALESCE(pt."organizationName", d."householdName"))) = LOWER(TRIM(${orgNameOnly}))`
              : destLabel.length > 0
                ? Prisma.sql`LOWER(TRIM(COALESCE(pt."organizationName", d."householdName"))) = LOWER(TRIM(${destLabel}))`
                : Prisma.sql`FALSE`;

        const orphanPredicate =
            orgNameOnly != null
                ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${orgNameOnly}))`
                : hh && destLabel.length > 0
                  ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))`
                  : destLabel.length > 0
                    ? Prisma.sql`AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${destLabel}))`
                    : Prisma.sql`AND FALSE`;

        const justEatsHouseholdPredicate =
            scope.kind === 'partner' && householdId18Param
                ? Prisma.sql`t."householdId" = ${scope.partnerHouseholdId18}`
                : householdId18Param
                  ? Prisma.sql`t."householdId" = ${householdId18Param}`
                  : destLabel.length > 0
                    ? Prisma.sql`LOWER(TRIM(t."householdName")) = LOWER(TRIM(${destLabel}))`
                    : Prisma.sql`FALSE`;

        const [joinedFood, orphanFood, jeFood, tagJoined, tagOrphan] = await Promise.all([
            prisma.$queryRaw<FoodRow[]>`
                SELECT
                    COALESCE(p."pantryProductName", 'Unknown') AS "productName",
                    SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalWeightLbs"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE DATE_TRUNC('day', d."date") = DATE_TRUNC('day', ${date})
                  AND ${joinedPartnerPredicate}
                GROUP BY p."pantryProductName"
            `,
            prisma.$queryRaw<FoodRow[]>`
                SELECT
                    COALESCE(t."pantryProductName", 'Unknown') AS "productName",
                    SUM(${inventoryTxPoundsSql()}) AS "totalWeightLbs"
                FROM "AllInventoryTransactions" t
                WHERE DATE_TRUNC('day', t."date") = DATE_TRUNC('day', ${date})
                  AND ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  ${orphanPredicate}
                GROUP BY t."pantryProductName"
            `,
            prisma.$queryRaw<FoodRow[]>`
                SELECT
                    COALESCE(t."productPackageName", 'Unknown') AS "productName",
                    (
                        SUM(
                            GREATEST(
                                COALESCE(t."numberPickedUp", 1),
                                COALESCE(t."numberDistributed", 1)
                            )
                        ) * 25
                    ) AS "totalWeightLbs"
                FROM "JustEatsBoxes" t
                WHERE DATE_TRUNC('day', t."pantryVisitDateTime") = DATE_TRUNC('day', ${date})
                  AND ${justEatsHouseholdPredicate}
                GROUP BY t."productPackageName"
            `,
            prisma.$queryRaw<TagRow[]>`
                SELECT DISTINCT t."productType", t."minimallyProcessedFood"
                FROM "AllInventoryTransactions" t
                INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
                INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
                LEFT JOIN "Partner" pt ON pt."householdId18" = d."householdId18"
                WHERE DATE_TRUNC('day', d."date") = DATE_TRUNC('day', ${date})
                  AND ${joinedPartnerPredicate}
            `,
            prisma.$queryRaw<TagRow[]>`
                SELECT DISTINCT t."productType", t."minimallyProcessedFood"
                FROM "AllInventoryTransactions" t
                WHERE DATE_TRUNC('day', t."date") = DATE_TRUNC('day', ${date})
                  AND ${distributionInventoryTypeCondition}
                  AND ${orphanInventoryCondition}
                  ${orphanPredicate}
            `,
        ]);

        const foodMap = mergeFoodMaps([
            rowsToMap(joinedFood),
            rowsToMap(orphanFood),
            rowsToMap(jeFood),
        ]);

        const foodRowsSorted = [...foodMap.entries()]
            .map(([name, lbs]) => ({
                productName: name,
                totalWeightLbs: lbs,
            }))
            .sort((a, b) => b.totalWeightLbs - a.totalWeightLbs);

        const totalPounds = foodRowsSorted.reduce((sum, r) => sum + r.totalWeightLbs, 0);

        const nutritionalTags = buildNutritionalTags([...tagJoined, ...tagOrphan]);

        return NextResponse.json({
            date: date.toISOString().slice(0, 10),
            organizationName:
                org ||
                destinationParam ||
                (scope.kind === 'partner' ? scope.destination : 'Selected Organization'),
            totalPounds: Math.round(totalPounds),
            nutritionalTags,
            foodsDelivered: foodRowsSorted.map(r => ({
                name: r.productName,
                weight: `${Math.round(r.totalWeightLbs).toLocaleString()} lbs`,
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
