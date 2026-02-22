import { NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';

export async function GET() {
    try {
        // Fetch data
        const destinations = await prisma.productPackageDestination.findMany();

        const packages = await prisma.packagesByItem.findMany({
            where: {
                productPackageId18: {
                    not: null,
                },
            },
        });

        const transactions = await prisma.inventoryTransaction.findMany();

        // Map InventoryTransaction by productInventoryRecordId18
        const inventoryTransactionMap = new Map(
            transactions.map(t => [t.productInventoryRecordId18, t])
        );

        // Map ProductPackageDestination by productPackageId18
        const destinationMap = new Map(destinations.map(d => [d.productPackageId18, d]));

        const unmatchedInventoryIds = new Set<string>();
        const unmatchedPackageIds = new Set<string>();

        // Start from destinations (the base), grouped by household
        const householdMap = new Map<
            string,
            {
                householdId18: string;
                householdName: string;
                productPackageIds: Set<string>;
                totalPoundsDelivered: number;
                transactionIds: Set<number>;
            }
        >();

        // Add ALL destinations, even ones with no packages
        for (const dest of destinations) {
            if (!householdMap.has(dest.householdId18)) {
                householdMap.set(dest.householdId18, {
                    householdId18: dest.householdId18,
                    householdName: dest.householdName,
                    productPackageIds: new Set(),
                    totalPoundsDelivered: 0,
                    transactionIds: new Set(),
                });
            }
            householdMap.get(dest.householdId18)!.productPackageIds.add(dest.productPackageId18);
        }

        // Enrich with package/transaction data where available
        for (const pkg of packages) {
            const packageId = pkg.productPackageId18;
            if (!packageId) continue;

            const destination = destinationMap.get(packageId);
            if (!destination) {
                unmatchedPackageIds.add(packageId);
                continue;
            }

            const agg = householdMap.get(destination.householdId18);
            if (!agg) continue;

            agg.totalPoundsDelivered += Number(pkg.pantryProductWeightLbs ?? 0);

            // Only add transaction if it exists — don't skip the whole row
            if (pkg.productInventoryRecordId18) {
                const transaction = inventoryTransactionMap.get(pkg.productInventoryRecordId18);
                if (transaction) {
                    agg.transactionIds.add(transaction.id);
                } else {
                    unmatchedInventoryIds.add(pkg.productInventoryRecordId18);
                }
            }
        }

        // Convert to response format
        const result = Array.from(householdMap.values()).map(d => ({
            householdId18: d.householdId18,
            householdName: d.householdName,
            productPackageIds: Array.from(d.productPackageIds),
            totalPoundsDelivered: d.totalPoundsDelivered,
            deliveryCount: d.transactionIds.size,
        }));

        return NextResponse.json({
            destinations: result,
            debug: {
                totalDestinations: destinations.length,
                totalPackageItems: packages.length,
                totalTransactions: transactions.length,
                householdsReturned: result.length,
                unmatchedInventoryRecordIds: Array.from(unmatchedInventoryIds),
                unmatchedProductPackageIds: Array.from(unmatchedPackageIds),
            },
        });
    } catch (error) {
        console.error('Error fetching destinations:', error);

        return NextResponse.json({ error: 'Failed to fetch destinations' }, { status: 500 });
    }
}
