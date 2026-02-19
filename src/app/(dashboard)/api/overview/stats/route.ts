import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

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
 * GET /api/overview/stats?start=...&end=...&destination=...
 * Returns totalPoundsDelivered and deliveriesCompleted (distinct date+destination) in range.
 */
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
            select: { date: true, weightLbs: true, destination: true },
        });

        let totalPoundsDelivered = 0;
        const deliveryKeys = new Set<string>();

        for (const r of records) {
            totalPoundsDelivered += r.weightLbs ?? 0;
            const day = new Date(r.date).toISOString().slice(0, 10);
            const dest = r.destination ?? '';
            deliveryKeys.add(`${day}|${dest}`);
        }

        return NextResponse.json({
            totalPoundsDelivered: Math.round(totalPoundsDelivered),
            deliveriesCompleted: deliveryKeys.size,
        });
    } catch (err: unknown) {
        console.error('Overview stats error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load overview stats' },
            { status: 500 }
        );
    }
}
