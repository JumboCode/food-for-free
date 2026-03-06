import { NextRequest, NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

function parseDateParam(dateParam: string | null): Date | null {
    if (!dateParam) return null;
    const date = new Date(dateParam);
    return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const dateParam = searchParams.get('date');
        const destination = searchParams.get('destination');

        if (!dateParam || !destination) {
            return NextResponse.json(
                { error: 'Missing required query parameters: date and destination' },
                { status: 400 }
            );
        }

        const date = parseDateParam(dateParam);
        if (!date) {
            return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }

        // Range for the full day
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Find the transactions for this delivery (date + destination)
        const transactions = await prisma.inventoryTransaction.findMany({
            where: {
                date: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
                destination,
            },
            select: {
                date: true,
                destination: true,
                weightLbs: true,
                pantryProductName: true,
                inventoryType: true,
                productInventoryRecordId18: true,
            },
        });

        const recordIds = transactions.map(t => t.productInventoryRecordId18).filter(Boolean);

        const packages = recordIds.length
            ? await prisma.packagesByItem.findMany({
                  where: {
                      productInventoryRecordId18: {
                          in: recordIds,
                      },
                  },
                  select: {
                      pantryProductName: true,
                      pantryProductWeightLbs: true,
                      lotFoodRescueProgram: true,
                  },
              })
            : [];

        const foodsDelivered = packages.map(pkg => ({
            name: pkg.pantryProductName ?? 'Unknown Item',
            weight: `${Number(pkg.pantryProductWeightLbs ?? 0).toFixed(2)} lbs`,
        }));

        const nutritionalTags = Array.from(
            new Set(
                transactions
                    .map(t => t.inventoryType)
                    .filter(Boolean)
                    .map(t => t.trim())
            )
        );

        const totalPounds = transactions.reduce((sum, t) => sum + (t.weightLbs ?? 0), 0);

        return NextResponse.json({
            date: date.toISOString(),
            organizationName: destination,
            totalPounds: Number(totalPounds.toFixed(2)),
            nutritionalTags,
            foodsDelivered,
        });
    } catch (err: unknown) {
        console.error('Delivery detail error:', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to load delivery detail' },
            { status: 500 }
        );
    }
}
