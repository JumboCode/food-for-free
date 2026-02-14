import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const partner = searchParams.get('partner');

        const whereClause: Prisma.InventoryTransactionWhereInput = {};

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        if (partner && partner !== 'all' && partner !== 'All Organizations') {
            whereClause.destination = partner;
        }

        const records = await prisma.inventoryTransaction.findMany({
            where: whereClause,
            select: {
                date: true,
                destination: true,
                weightLbs: true,
                amount: true,
                productUnitsForDisplay: true,
            },
        });

        // Use a typed Record instead of any
        const deliveryMap: Record<
            string,
            {
                date: Date;
                destination: string;
                totalPounds: number;
                amount: number;
                productUnitsForDisplay: string;
            }
        > = {};

        records.forEach(record => {
            if (record.date && record.destination) {
                const key = `${record.date.toISOString()}-${record.destination}`;
                const poundsForThisRecord =
                    record.productUnitsForDisplay?.toLowerCase() === 'cases'
                        ? (record.amount || 0) * (record.weightLbs || 0)
                        : record.weightLbs || 0;

                if (!deliveryMap[key]) {
                    deliveryMap[key] = {
                        date: record.date,
                        destination: record.destination,
                        totalPounds: poundsForThisRecord,
                        amount: record.amount || 0,
                        productUnitsForDisplay: record.productUnitsForDisplay || '',
                    };
                } else {
                    deliveryMap[key].totalPounds += poundsForThisRecord;
                }
            }
        });

        const deliveries = Object.values(deliveryMap).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json(deliveries);
    } catch (err: unknown) {
        const error = err as Error;
        console.error('Deliveries Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch deliveries' },
            { status: 500 }
        );
    }
}
