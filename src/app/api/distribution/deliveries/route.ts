import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerFilter,
    scopeToPartnerHouseholdId18,
} from '~/lib/overviewAccess';
import {
    queryDistributionDeliveries,
    queryJustEatsDistributionDeliveries,
} from '~/lib/distributionDeliveries';

/**
 * GET /api/distribution/deliveries?start=&end=&search=&destination=
 * Line-level deliveries for the Distribution dashboard (admin: all orgs or ?destination=; partner: scoped).
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const scope = await getOverviewScope(searchParams.get('destination'));
    const scopeErr = overviewScopeErrorResponse(scope);
    if (scopeErr) return scopeErr;

    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (!startParam || !endParam) {
        return NextResponse.json({ error: 'start and end dates are required' }, { status: 400 });
    }

    const start = new Date(startParam);
    const end = new Date(endParam);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const partnerHouseholdId18 = scopeToPartnerHouseholdId18(scope);
    const orgFilter = partnerHouseholdId18 ? undefined : scopeToPartnerFilter(scope);

    const [bulk, justEats] = await Promise.all([
        queryDistributionDeliveries(prisma, {
            start,
            end,
            search,
            orgFilter,
            partnerHouseholdId18,
        }),
        queryJustEatsDistributionDeliveries(prisma, {
            start,
            end,
            search,
            orgFilter,
            partnerHouseholdId18,
        }),
    ]);

    const merged = [...bulk, ...justEats].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(merged);
}
