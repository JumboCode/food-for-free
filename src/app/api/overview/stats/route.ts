import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const partner = searchParams.get('partner');

        const where: Prisma.InventoryTransactionWhereInput = {};

        if (startDate && endDate) {
            where.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        if (partner && partner !== 'All Organizations' && partner !== 'all') {
            where.destination = partner;
        }

        const records = await prisma.inventoryTransaction.findMany({
            where,
            select: {
                amount: true,
                weightLbs: true,
                productUnitsForDisplay: true,
                destination: true,
                date: true,
            },
        });

        let totalPounds = 0;
        const distinctDeliveries = new Set<string>();

        records.forEach(r => {
            const weight =
                r.productUnitsForDisplay?.toLowerCase() === 'cases'
                    ? (r.amount || 0) * (r.weightLbs || 0)
                    : r.weightLbs || 0;

            totalPounds += weight;

            if (r.date && r.destination) {
                distinctDeliveries.add(`${r.date.toISOString()}-${r.destination}`);
            }
        });

        return NextResponse.json({
            totalPoundsDelivered: totalPounds,
            deliveriesCompleted: distinctDeliveries.size,
        });
    } catch (err: unknown) {
        const error = err as Error;
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
