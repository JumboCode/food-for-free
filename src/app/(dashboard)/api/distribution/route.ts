import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import prisma from '~/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await requireAdmin();

        const { searchParams } = new URL(req.url);
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!start || !end) return NextResponse.json({ error: 'Dates required' }, { status: 400 });

        const search = searchParams.get('search') || '';

        const records = await prisma.allInventoryTransactions.findMany({
            where: {
                date: { gte: new Date(start), lte: new Date(end) },
                OR: [
                    { destination: { contains: search, mode: 'insensitive' } },
                    { pantryProductName: { contains: search, mode: 'insensitive' } },
                ],
            },
            orderBy: { date: 'desc' },
        });

        if (records.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const headers = ['Date', 'Organization', 'Product', 'Weight (lbs)', 'Type', 'Source'];
        const rows = records.map(r => [
            r.date ? r.date.toISOString().split('T')[0] : '',
            `"${(r.destination || '').replace(/"/g, '""')}"`,
            `"${(r.pantryProductName || '').replace(/"/g, '""')}"`,
            r.weightLbs || 0,
            r.inventoryType || '',
            `"${(r.source || '').replace(/"/g, '""')}"`,
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map((row: (string | number)[]) => row.join(',')),
        ].join('\n');

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="distribution-export.csv"`,
            },
        });
    } catch (error: unknown) {
        console.error('Export Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
