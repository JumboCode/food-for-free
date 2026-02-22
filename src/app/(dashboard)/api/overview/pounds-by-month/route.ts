import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

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
    start.setMonth(start.getMonth() - 11);
    start.setDate(1);
    return { start, end };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const destination = searchParams.get('destination') ?? undefined;

        const where: { date: { gte: Date; lte: Date }; destination?: string } = {
            date: {
                gte: range.start,
                lte: range.end,
            },
        };
        if (destination && destination !== 'All Organizations') {
            where.destination = destination;
        }

        const records = await prisma.inventoryTransaction.findMany({
            where,
            select: { date: true, weightLbs: true },
        });

        const daysDiff = Math.ceil(
            (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsDiff =
            range.end.getFullYear() -
            range.start.getFullYear() +
            (range.end.getMonth() - range.start.getMonth()) / 12;
        const aggregateByYear = yearsDiff > 2;
        const aggregateByDay = daysDiff <= 30 && !aggregateByYear;

        const buckets: Record<string, number> = {};

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

        const chartData = Object.entries(buckets)
            .map(([month, pounds]) => ({ month, pounds: Math.round(pounds) }))
            .sort((a, b) => {
                if (aggregateByYear) return parseInt(a.month, 10) - parseInt(b.month, 10);
                if (aggregateByDay) {
                    const [ma, da] = a.month.split('/').map(Number);
                    const [mb, db] = b.month.split('/').map(Number);
                    const dateA = new Date(range.start.getFullYear(), ma - 1, da);
                    const dateB = new Date(range.start.getFullYear(), mb - 1, db);
                    return dateA.getTime() - dateB.getTime();
                }
                const [monthA, yearA] = a.month.split(' ');
                const [monthB, yearB] = b.month.split(' ');
                const dateA = new Date(parseInt(yearA, 10), MONTH_NAMES.indexOf(monthA), 1);
                const dateB = new Date(parseInt(yearB, 10), MONTH_NAMES.indexOf(monthB), 1);
                return dateA.getTime() - dateB.getTime();
            });

        return NextResponse.json(chartData);
    } catch (err: unknown) {
        console.error('Pounds-by-month error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load pounds by month' },
            { status: 500 }
        );
    }
}
