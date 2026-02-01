import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

export async function GET() {
    try {
        const records = await prisma.inventoryRecord.findMany({
            where: { destination: 'Puffin' },
        });

        const monthNames = [
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

        const poundsByMonth: Record<string, number> = {};

        for (const r of records) {
            if (!r.date) continue;

            const jsDate = new Date(r.date);
            const monthIndex = jsDate.getUTCMonth(); // 0–11

            const monthName = monthNames[monthIndex];
            const weight = r.weightLbs ?? 0;

            poundsByMonth[monthName] = (poundsByMonth[monthName] ?? 0) + weight;
        }

        const chartData = monthNames.map(month => ({
            month,
            pounds: poundsByMonth[month] ?? 0,
        }));

        return NextResponse.json(chartData);
    } catch (err: unknown) {
        console.error('Analytics Error:', err);
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message || 'Failed to load analytics' }, { status: 500 });
    }
}
