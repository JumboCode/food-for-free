import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export type DistributionDeliveryRow = {
    date: Date;
    organizationName: string;
    householdId18: string;
    productName: string | null;
    weightLbs: number | null;
    inventoryType: string;
    productType: string | null;
    minimallyProcessedFood: boolean | null;
    foodRescueProgram: string | null;
    source: string | null;
};

type Db = Pick<PrismaClient, '$queryRaw'>;

export async function queryDistributionDeliveries(
    db: Db,
    params: {
        start: Date;
        end: Date;
        search: string;
        orgFilter: string | undefined;
    }
): Promise<DistributionDeliveryRow[]> {
    const search = params.search.trim().toLowerCase();
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

    const orgClause = params.orgFilter
        ? Prisma.sql` AND d."householdName" ILIKE ${params.orgFilter} `
        : Prisma.empty;

    // Do not require t.destination: source exports often leave it blank; org is d.householdName via join.
    return db.$queryRaw<DistributionDeliveryRow[]>`
        SELECT
            t."date" AS "date",
            d."householdName" AS "organizationName",
            d."householdId18" AS "householdId18",
            p."pantryProductName" AS "productName",
            p."pantryProductWeightLbs" AS "weightLbs",
            t."inventoryType" AS "inventoryType",
            t."productType" AS "productType",
            t."minimallyProcessedFood" AS "minimallyProcessedFood",
            p."lotFoodRescueProgram" AS "foodRescueProgram",
            t."source" AS "source"
        FROM "AllInventoryTransactions" t
        INNER JOIN "AllPackagesByItem" p
            ON p."productInventoryRecordId18" = t."productInventoryRecordId18"
        INNER JOIN "AllProductPackageDestinations" d
            ON d."productPackageId18" = p."productPackageId18"
        WHERE t."date" >= ${params.start}
          AND t."date" <= ${params.end}
          ${orgClause}
          ${searchClause}
        ORDER BY t."date" DESC
    `;
}
