import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '~/lib/prisma';

type DestinationsResponseRow = {
    householdId18: string;
    householdName: string;
    productPackageIds: string[];
    totalPoundsDelivered: number;
    deliveryCount: number;
};

function getBytes(value: unknown): number {
    return Buffer.byteLength(
        JSON.stringify(value ?? null, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
        'utf8'
    );
}

function bytesToMb(bytes: number): number {
    return Number((bytes / (1024 * 1024)).toFixed(4));
}

function bytesToGb(bytes: number): number {
    return Number((bytes / (1024 * 1024 * 1024)).toFixed(6));
}

async function getDestinationsAggregate() {
    type DestinationAggregateRow = {
        householdId18: string;
        householdName: string;
        productPackageIds: string[] | null;
        totalPoundsDelivered: number | string | null;
        deliveryCount: number | string;
    };
    type SingleCountRow = { count: number | string };
    type IdRow = { id: string };

    const [
        aggregatedRows,
        destinationCountRows,
        packageCountRows,
        transactionCountRows,
        unmatchedInventoryRows,
        unmatchedPackageRows,
    ] = await Promise.all([
        prisma.$queryRaw<DestinationAggregateRow[]>`
            SELECT
                d."householdId18" AS "householdId18",
                d."householdName" AS "householdName",
                ARRAY_AGG(DISTINCT d."productPackageId18") AS "productPackageIds",
                COALESCE(SUM(p."pantryProductWeightLbs"), 0) AS "totalPoundsDelivered",
                COUNT(DISTINCT it."productInventoryRecordId18") AS "deliveryCount"
            FROM "AllProductPackageDestinations" d
            LEFT JOIN "AllPackagesByItem" p
                ON p."productPackageId18" = d."productPackageId18"
            LEFT JOIN "AllInventoryTransactions" it
                ON it."productInventoryRecordId18" = p."productInventoryRecordId18"
            GROUP BY d."householdId18", d."householdName"
            ORDER BY d."householdName" ASC
        `,
        prisma.$queryRaw<SingleCountRow[]>`
            SELECT COUNT(*) AS count FROM "AllProductPackageDestinations"
        `,
        prisma.$queryRaw<SingleCountRow[]>`
            SELECT COUNT(*) AS count FROM "AllPackagesByItem" WHERE "productPackageId18" IS NOT NULL
        `,
        prisma.$queryRaw<SingleCountRow[]>`
            SELECT COUNT(*) AS count FROM "AllInventoryTransactions"
        `,
        prisma.$queryRaw<IdRow[]>`
            SELECT DISTINCT p."productInventoryRecordId18" AS id
            FROM "AllPackagesByItem" p
            INNER JOIN "AllProductPackageDestinations" d
                ON d."productPackageId18" = p."productPackageId18"
            LEFT JOIN "AllInventoryTransactions" it
                ON it."productInventoryRecordId18" = p."productInventoryRecordId18"
            WHERE p."productInventoryRecordId18" IS NOT NULL
              AND it."productInventoryRecordId18" IS NULL
            ORDER BY p."productInventoryRecordId18" ASC
        `,
        prisma.$queryRaw<IdRow[]>`
            SELECT DISTINCT p."productPackageId18" AS id
            FROM "AllPackagesByItem" p
            LEFT JOIN "AllProductPackageDestinations" d
                ON d."productPackageId18" = p."productPackageId18"
            WHERE p."productPackageId18" IS NOT NULL
              AND d."productPackageId18" IS NULL
            ORDER BY p."productPackageId18" ASC
        `,
    ]);

    const result: DestinationsResponseRow[] = aggregatedRows.map(row => ({
        householdId18: row.householdId18,
        householdName: row.householdName,
        productPackageIds: row.productPackageIds ?? [],
        totalPoundsDelivered: Number(row.totalPoundsDelivered ?? 0),
        deliveryCount: Number(row.deliveryCount ?? 0),
    }));

    const dbReadBytes =
        getBytes(aggregatedRows) +
        getBytes(destinationCountRows) +
        getBytes(packageCountRows) +
        getBytes(transactionCountRows) +
        getBytes(unmatchedInventoryRows) +
        getBytes(unmatchedPackageRows);

    return {
        result,
        debug: {
            totalDestinations: Number(destinationCountRows[0]?.count ?? 0),
            totalPackageItems: Number(packageCountRows[0]?.count ?? 0),
            totalTransactions: Number(transactionCountRows[0]?.count ?? 0),
            householdsReturned: result.length,
            unmatchedInventoryRecordIds: unmatchedInventoryRows.map(row => row.id),
            unmatchedProductPackageIds: unmatchedPackageRows.map(row => row.id),
            dbReadEstimatedBytes: dbReadBytes,
            dbReadEstimatedMB: bytesToMb(dbReadBytes),
            dbReadEstimatedGB: bytesToGb(dbReadBytes),
        },
    };
}

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        await requireAdmin();
        const runStartedAt = Date.now();

        const execution = await getDestinationsAggregate();
        const responseBytes = getBytes(execution.result);

        return NextResponse.json({
            destinations: execution.result,
            debug: {
                ...execution.debug,
                requestDurationMs: Date.now() - runStartedAt,
                responseEstimatedBytes: responseBytes,
                responseEstimatedMB: bytesToMb(responseBytes),
                responseEstimatedGB: bytesToGb(responseBytes),
            },
        });
    } catch (error) {
        console.error('Error fetching destinations:', error);

        if (error instanceof Error && error.message.includes('Unauthorized')) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        return NextResponse.json({ error: 'Failed to fetch destinations' }, { status: 500 });
    }
}
