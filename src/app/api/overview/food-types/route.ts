import { NextRequest, NextResponse } from 'next/server';
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
 * Returns count of transactions by inventoryType for the donut chart (food types donated).
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(searchParams.get('destination'));
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const destination = scopeToPartnerFilter(scope);

        const where = destination
            ? {
                  date: { gte: range.start, lte: range.end },
                  destination,
              }
            : {
                  date: { gte: range.start, lte: range.end },
                  destination: { not: null as string | null },
                  NOT: { destination: '' },
              };

        const grouped = await prisma.allInventoryTransactions.groupBy({
            by: ['inventoryType'],
            where,
            _count: { _all: true },
        });

        const colors = ['#B7D7BD', '#6CAEE6', '#F9DC70', '#E7A54E', '#F4A6B8'];
        const data = grouped.map((row, index) => ({
            label: row.inventoryType.trim() || 'Other',
            value: row._count._all,
            color: colors[index % colors.length],
        }));

        return NextResponse.json(data);
    } catch (err: unknown) {
        console.error('Overview food-types error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load food types' },
            { status: 500 }
        );
    }
}
