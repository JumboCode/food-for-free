import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';
import {
    queryDistributionDeliveries,
    queryJustEatsDistributionDeliveries,
} from '~/lib/distributionDeliveries';

function getPast12MonthsRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);
    start.setMonth(start.getMonth() - 12);
    start.setDate(start.getDate() + 1);
    return { start, end };
}

export async function GET(req: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        await requireAdmin();
    } catch {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const defaultRange = getPast12MonthsRange();
    const start = startParam ? new Date(startParam) : defaultRange.start;
    const end = endParam ? new Date(endParam) : defaultRange.end;

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const [bulk, justEats] = await Promise.all([
        queryDistributionDeliveries(prisma, {
            start,
            end,
            search,
            orgFilter: undefined,
        }),
        queryJustEatsDistributionDeliveries(prisma, {
            start,
            end,
            search,
            orgFilter: undefined,
        }),
    ]);

    const merged = [...bulk, ...justEats].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(merged);
}
