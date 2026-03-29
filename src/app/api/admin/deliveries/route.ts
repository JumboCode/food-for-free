import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

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

    // Scope reads by date first so we don't pull full tables from Neon.
    const transactions = await prisma.inventoryTransaction.findMany({
        where: {
            date: { gte: start, lte: end },
        },
        select: {
            productInventoryRecordId18: true,
            date: true,
            inventoryType: true,
        },
    });

    if (transactions.length === 0) return NextResponse.json([]);

    const transactionByRecordId = new Map<string, (typeof transactions)[number]>();
    for (const t of transactions) {
        const id = t.productInventoryRecordId18;
        if (id && !transactionByRecordId.has(id)) transactionByRecordId.set(id, t);
    }
    const recordIds = Array.from(transactionByRecordId.keys());

    const packages = await prisma.packagesByItem.findMany({
        where: {
            productInventoryRecordId18: { in: recordIds },
            productPackageId18: { not: null },
        },
        select: {
            productInventoryRecordId18: true,
            productPackageId18: true,
            pantryProductName: true,
            pantryProductWeightLbs: true,
            lotFoodRescueProgram: true,
        },
    });

    if (packages.length === 0) return NextResponse.json([]);

    const packageIds = Array.from(
        new Set(packages.map(p => p.productPackageId18).filter((id): id is string => Boolean(id)))
    );

    const destinations = await prisma.productPackageDestination.findMany({
        where: { productPackageId18: { in: packageIds } },
        select: {
            productPackageId18: true,
            householdName: true,
            householdId18: true,
        },
    });

    const destinationByPackageId = new Map<string, (typeof destinations)[number]>();
    for (const d of destinations) destinationByPackageId.set(d.productPackageId18, d);

    const distributionDeliveries = [];
    for (const item of packages) {
        const recordId = item.productInventoryRecordId18;
        const packageId = item.productPackageId18;
        if (!recordId || !packageId) continue;

        const transactionInfo = transactionByRecordId.get(recordId);
        const destinationInfo = destinationByPackageId.get(packageId);
        if (!transactionInfo || !destinationInfo) continue;

        const row = {
            date: transactionInfo.date,
            organizationName: destinationInfo.householdName,
            householdId18: destinationInfo.householdId18,
            productName: item.pantryProductName,
            weightLbs: item.pantryProductWeightLbs,
            inventoryType: transactionInfo.inventoryType,
            foodRescueProgram: item.lotFoodRescueProgram,
        };

        if (search) {
            const org = row.organizationName.toLowerCase();
            const product = (row.productName || '').toLowerCase();
            const type = (row.inventoryType || '').toLowerCase();
            if (!org.includes(search) && !product.includes(search) && !type.includes(search)) {
                continue;
            }
        }

        distributionDeliveries.push(row);
    }

    distributionDeliveries.sort((a, b) => b.date.getTime() - a.date.getTime());
    return NextResponse.json(distributionDeliveries);
}
