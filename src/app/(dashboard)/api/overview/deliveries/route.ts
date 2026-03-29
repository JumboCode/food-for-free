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
        const scope = await getOverviewScope(searchParams.get('destination'));
        const scopeErr = overviewScopeErrorResponse(scope);
        if (scopeErr) return scopeErr;

        const range = parseDateRange(searchParams) ?? getDefaultRange();
        const partnerFilter = scopeToPartnerFilter(scope);

        if (partnerFilter) {
            const destRows = await fetchPartnerDestinationsInRange(partnerFilter, range);
            const packageIds = Array.from(
                new Set(destRows.map(r => r.productPackageId18).filter(Boolean))
            );
            const weightsByPackage = await sumWeightsByProductPackageId(packageIds);

            const byDay = new Map<string, { date: Date; totalPounds: number }>();
            for (const row of destRows) {
                const d = new Date(row.date);
                const day = d.toISOString().slice(0, 10);
                const w = weightsByPackage.get(row.productPackageId18) ?? 0;
                const existing = byDay.get(day);
                if (existing) {
                    existing.totalPounds += w;
                } else {
                    byDay.set(day, { date: d, totalPounds: w });
                }
            }

            const deliveries = Array.from(byDay.entries())
                .map(([day, v]) => ({
                    id: `${day}|${partnerFilter}`,
                    date: v.date.toISOString(),
                    totalPounds: Math.round(v.totalPounds),
                    destination: partnerFilter,
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .reverse();

            return NextResponse.json({ deliveries: deliveries.slice(0, 10) });
        }

        const where = {
            date: {
                gte: range.start,
                lte: range.end,
            },
        };

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

        return NextResponse.json({ deliveries: deliveries.slice(0, 10) });
    } catch (err: unknown) {
        console.error('Overview deliveries error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load deliveries' },
            { status: 500 }
        );
    }
}
