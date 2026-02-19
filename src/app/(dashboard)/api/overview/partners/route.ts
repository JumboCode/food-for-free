import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

/**
 * GET /api/overview/partners
 * Returns distinct destinations from InventoryTransaction for partner filter dropdown.
 */
export async function GET() {
    try {
        const records = await prisma.inventoryTransaction.findMany({
            where: { destination: { not: null } },
            select: { destination: true },
            distinct: ['destination'],
        });

        const names = records
            .map(r => r.destination)
            .filter((d): d is string => d != null && d.trim() !== '');

        const unique = Array.from(new Set(names)).sort();

        return NextResponse.json({
            partners: unique.map((name, index) => ({
                id: index + 1,
                name,
                location: '',
                type: 'Partner',
            })),
        });
    } catch (err: unknown) {
        console.error('Overview partners error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load partners' },
            { status: 500 }
        );
    }
}
