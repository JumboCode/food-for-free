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
 * GET /api/overview/deliveries?start=...&end=...&destination=...
 * Returns list of deliveries (grouped by date + destination) with id, date, totalPounds, destination.
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

        const byKey = new Map<
            string,
            { date: Date; totalPounds: number; destination: string | null }
        >();

        for (const r of records) {
            const d = new Date(r.date);
            const day = d.toISOString().slice(0, 10);
            const dest = r.destination ?? null;
            const key = `${day}|${dest ?? ''}`;
            const weight = r.weightLbs ?? 0;
            const existing = byKey.get(key);
            if (existing) {
                existing.totalPounds += weight;
            } else {
                byKey.set(key, { date: d, totalPounds: weight, destination: dest });
            }
        }

        const deliveries = Array.from(byKey.entries())
            .map(([key, v]) => ({
                id: key,
                date: v.date.toISOString(),
                totalPounds: Math.round(v.totalPounds),
                destination: v.destination,
            }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .reverse();

        return NextResponse.json({ deliveries });
    } catch (err: unknown) {
        console.error('Overview deliveries error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load deliveries' },
            { status: 500 }
        );
    }
}
