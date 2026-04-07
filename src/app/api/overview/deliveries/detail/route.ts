import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { getOverviewScope, overviewScopeErrorResponse } from '~/lib/overviewAccess';

type FoodRow = { productName: string | null; totalWeightLbs: number | null };

/**
 * GET /api/overview/deliveries/detail?date=YYYY-MM-DD&org=OrgName
 * Returns itemized foods delivered for a specific date + organization.
 * Admin: any org. Partner: only their own org.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    const org = searchParams.get('org')?.trim() ?? '';

    if (!dateParam || !org) {
        return NextResponse.json({ error: 'Missing date or org parameter' }, { status: 400 });
    }

    const date = new Date(dateParam);
    if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const scope = await getOverviewScope(null);
    const scopeErr = overviewScopeErrorResponse(scope);
    if (scopeErr) return scopeErr;

    // Partners can only view their own org's data
    if (scope.kind === 'partner' && scope.destination.toLowerCase() !== org.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        // Mirror the same join as queryDistributionDeliveries so t.date (AllInventoryTransactions)
        // is used for filtering — matching the date shown in the distribution table rows.
        const foodRows = await prisma.$queryRaw<FoodRow[]>`
            SELECT
                COALESCE(p."pantryProductName", 'Unknown') AS "productName",
                SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "totalWeightLbs"
            FROM "AllInventoryTransactions" t
            INNER JOIN "AllPackagesByItem" p ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
            INNER JOIN "AllProductPackageDestinations" d ON d."productPackageId18" = p."productPackageId18"
            WHERE DATE_TRUNC('day', t."date") = DATE_TRUNC('day', ${date})
              AND d."householdName" ILIKE ${org}
            GROUP BY p."pantryProductName"
            ORDER BY SUM(COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) DESC
        `;

        const totalPounds = foodRows.reduce((sum, r) => sum + Number(r.totalWeightLbs ?? 0), 0);

        return NextResponse.json({
            date: date.toISOString().slice(0, 10),
            organizationName: org,
            totalPounds: Math.round(totalPounds),
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
