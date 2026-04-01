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

        const foodTypeGrouped = await prisma.allInventoryTransactions.groupBy({
            by: ['productType'],
            where,
            _sum: { weightLbs: true },
        });

        const processingGrouped = await prisma.allInventoryTransactions.groupBy({
            by: ['minimallyProcessedFood'],
            where,
            _sum: { weightLbs: true },
        });

        const foodTypeColors = ['#B7D7BD', '#6CAEE6', '#F9DC70', '#E7A54E', '#F4A6B8', '#B39DDB'];
        const processingColorMap: Record<string, string> = {
            'Minimally Processed': '#B7D7BD',
            Processed: '#E7A54E',
            'Not Specified': '#CBD5E1',
        };

        const foodTypes = foodTypeGrouped
            .map((row, index) => ({
                label: row.productType?.trim() || 'Other',
                value: Math.round(Number(row._sum.weightLbs ?? 0)),
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
                    value: Math.round(Number(row._sum.weightLbs ?? 0)),
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
