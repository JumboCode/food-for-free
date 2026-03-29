import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import {
    getOverviewScope,
    overviewScopeErrorResponse,
    scopeToPartnerFilter,
} from '~/lib/overviewAccess';
import {
    fetchPartnerDestinationsInRange,
    sumWeightsByProductPackageId,
} from '~/lib/overviewPartnerMetrics';

const MONTH_NAMES = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

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
    start.setMonth(start.getMonth() - 12);
    start.setDate(start.getDate() + 1);
    return { start, end };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const scope = await getOverviewScope(searchParams.get('destination'));
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const partnerFilter = scopeToPartnerFilter(scope);

        const daysDiff = Math.ceil(
            (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsDiff =
            range.end.getFullYear() -
            range.start.getFullYear() +
            (range.end.getMonth() - range.start.getMonth()) / 12;
        const aggregateByYear = yearsDiff > 1;
        const aggregateByDay = daysDiff <= 30 && !aggregateByYear;

        const buckets: Record<string, number> = {};

        if (partnerFilter) {
            const destRows = await fetchPartnerDestinationsInRange(partnerFilter, range);
            const packageIds = Array.from(
                new Set(destRows.map(r => r.productPackageId18).filter(Boolean))
            );
            const weightsByPackage = await sumWeightsByProductPackageId(packageIds);

            for (const row of destRows) {
                const d = new Date(row.date);
                const weight = weightsByPackage.get(row.productPackageId18) ?? 0;
                let key: string;
                if (aggregateByYear) {
                    key = d.getFullYear().toString();
                } else if (aggregateByDay) {
                    key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                } else {
                    key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
                }
                buckets[key] = (buckets[key] ?? 0) + weight;
            }
        } else {
            const where = {
                date: {
                    gte: range.start,
                    lte: range.end,
                },
            };

            const records = await prisma.inventoryTransaction.findMany({
                where,
                select: { date: true, weightLbs: true },
            });

            for (const r of records) {
                const d = new Date(r.date);
                const weight = r.weightLbs ?? 0;
                let key: string;
                if (aggregateByYear) {
                    key = d.getFullYear().toString();
                } else if (aggregateByDay) {
                    key = `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
                } else {
                    key = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
                }
                buckets[key] = (buckets[key] ?? 0) + weight;
            }
        }

        // Build ordered list of all periods in range so chart shows only range span
        type Period = { month: string; order: number };
        const periodsInRange: Period[] = [];

        if (aggregateByYear) {
            // Only show years that have data (earliest data year onward)
            const yearsWithData = Object.keys(buckets)
                .filter(k => /^\d{4}$/.test(k))
                .map(y => parseInt(y, 10))
                .sort((a, b) => a - b);
            for (const y of yearsWithData) {
                periodsInRange.push({ month: String(y), order: y });
            }
        } else if (aggregateByDay) {
            const cursor = new Date(range.start);
            cursor.setHours(0, 0, 0, 0);
            const end = new Date(range.end);
            end.setHours(0, 0, 0, 0);
            let order = 0;
            while (cursor.getTime() <= end.getTime()) {
                const key = `${String(cursor.getMonth() + 1).padStart(2, '0')}/${String(cursor.getDate()).padStart(2, '0')}`;
                periodsInRange.push({ month: key, order: order++ });
                cursor.setDate(cursor.getDate() + 1);
            }
        } else {
            const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
            const end = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
            let order = 0;
            while (cursor.getTime() <= end.getTime()) {
                const key = `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
                periodsInRange.push({ month: key, order: order++ });
                cursor.setMonth(cursor.getMonth() + 1);
            }
        }

        const chartData = periodsInRange.map(({ month }) => ({
            month,
            pounds: Math.round(buckets[month] ?? 0),
        }));

        return NextResponse.json(chartData);
    } catch (err: unknown) {
        console.error('Pounds-by-month error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load pounds by month' },
            { status: 500 }
        );
    }
}
