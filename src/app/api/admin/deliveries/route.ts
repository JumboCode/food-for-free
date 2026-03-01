import { NextResponse } from 'next/server';
import { prisma } from '~/lib/prisma';

export async function GET() {
    const inventoryTransactions = new Map();
    const productPackageDestinations = new Map();
    const distributionDeliveries = [];

    const packages = await prisma.packagesByItem.findMany({
        where: {
            productInventoryRecordId18: {
                not: null,
            },
            productPackageId18: {
                not: null,
            },
        },
    });

    const transactions = await prisma.inventoryTransaction.findMany();
    const destinations = await prisma.productPackageDestination.findMany();

    for (const transaction of transactions) {
        inventoryTransactions.set(transaction.productInventoryRecordId18, transaction);
    }

    for (const destination of destinations) {
        productPackageDestinations.set(destination.productPackageId18, destination);
    }

    for (const item of packages) {
        const productInventoryRecordId18 = item.productInventoryRecordId18;
        const productPackageId18 = item.productPackageId18;

        if (
            inventoryTransactions.has(productInventoryRecordId18) &&
            productPackageDestinations.has(productPackageId18)
        ) {
            const destinationInfo = productPackageDestinations.get(productPackageId18);
            const transactionInfo = inventoryTransactions.get(productInventoryRecordId18);

            distributionDeliveries.push({
                date: transactionInfo.date,
                organizationName: destinationInfo.householdName,
                householdId18: destinationInfo.householdId18,
                productName: item.pantryProductName,
                weightLbs: item.pantryProductWeightLbs,
                inventoryType: transactionInfo.inventoryType,
                foodRescueProgram: item.lotFoodRescueProgram,
            });
        }
    }

    return NextResponse.json(distributionDeliveries);
}
