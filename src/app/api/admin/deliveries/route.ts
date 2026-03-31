import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { requireAdmin } from '@/lib/admin';
import { Prisma } from '@prisma/client';
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

    type DeliveryRow = {
        date: Date;
        organizationName: string;
        householdId18: string;
        productName: string | null;
        weightLbs: number | null;
        inventoryType: string;
        foodRescueProgram: string | null;
    };

    const searchFilter = search ? `%${search}%` : null;
    const searchClause = search
        ? Prisma.sql`
          AND (
            d."householdName" ILIKE ${searchFilter}
            OR COALESCE(p."pantryProductName", '') ILIKE ${searchFilter}
            OR COALESCE(t."inventoryType", '') ILIKE ${searchFilter}
          )
        `
        : Prisma.empty;

    const rows = await prisma.$queryRaw<DeliveryRow[]>`
        SELECT
            t."date" AS "date",
            d."householdName" AS "organizationName",
            d."householdId18" AS "householdId18",
            p."pantryProductName" AS "productName",
            p."pantryProductWeightLbs" AS "weightLbs",
            t."inventoryType" AS "inventoryType",
            p."lotFoodRescueProgram" AS "foodRescueProgram"
        FROM "AllInventoryTransactions" t
        INNER JOIN "AllPackagesByItem" p
            ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
        INNER JOIN "AllProductPackageDestinations" d
            ON d."productPackageId18" = p."productPackageId18"
        WHERE t."date" >= ${start}
          AND t."date" <= ${end}
          AND t."destination" IS NOT NULL
          AND BTRIM(t."destination") <> ''
          ${searchClause}
        ORDER BY t."date" DESC
    `;

    return NextResponse.json(rows);
}
