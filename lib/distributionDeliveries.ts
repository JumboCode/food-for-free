import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { OverviewScope } from '~/lib/overviewAccess';

/** Org name filter for distribution SQL (ILIKE). Undefined = all orgs (admin, no destination). */
export function distributionOrgScopeFromOverview(scope: OverviewScope): string | undefined {
    if (scope.kind === 'admin') return scope.destination;
    if (scope.kind === 'partner') return scope.destination;
    return undefined;
}

export type DistributionDeliveryRow = {
    date: Date;
    organizationName: string;
    householdId18: string;
    productName: string | null;
    distributionAmount: number;
    unitWeightLbs: number | null;
    weightLbs: number;
    inventoryType: string;
    productType: string | null;
    minimallyProcessedFood: boolean | null;
    foodRescueProgram: string | null;
    source: string | null;
    program: 'bulk_rescue' | 'just_eats';
    /** Stable id when present (Just Eats: `distributionId18`). */
    lineId: string | null;
};

type BulkRowDb = Omit<DistributionDeliveryRow, 'program' | 'lineId'>;

type Db = Pick<PrismaClient, '$queryRaw'>;

export async function queryDistributionDeliveries(
    db: Db,
    params: {
        start: Date;
        end: Date;
        search: string;
        orgFilter: string | undefined;
        /** When set (partner scope), filter by destination household id — matches overview stats. */
        partnerHouseholdId18?: string | undefined;
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
            OR COALESCE(t."productType", '') ILIKE ${searchFilter}
            OR COALESCE(t."source", '') ILIKE ${searchFilter}
            OR COALESCE(p."lotFoodRescueProgram", '') ILIKE ${searchFilter}
            OR (
              CASE
                WHEN t."minimallyProcessedFood" IS TRUE THEN 'Minimally Processed'
                WHEN t."minimallyProcessedFood" IS FALSE THEN 'Processed'
                ELSE 'Not Specified'
              END
            ) ILIKE ${searchFilter}
          )
        `
        : Prisma.empty;

    const destClause =
        params.partnerHouseholdId18 != null && params.partnerHouseholdId18 !== ''
            ? Prisma.sql` AND d."householdId18" = ${params.partnerHouseholdId18} `
            : params.orgFilter
              ? Prisma.sql` AND d."householdName" ILIKE ${params.orgFilter} `
              : Prisma.empty;

    // Do not require t.destination: source exports often leave it blank; org is d.householdName via join.
    // Use d.date (pantry visit date/time) for the delivery date shown in UI.
    const rows = await db.$queryRaw<BulkRowDb[]>`
        SELECT
            d."date" AS "date",
            d."householdName" AS "organizationName",
            d."householdId18" AS "householdId18",
            p."pantryProductName" AS "productName",
            COALESCE(p."distributionAmount", 1) AS "distributionAmount",
            p."pantryProductWeightLbs" AS "unitWeightLbs",
            (COALESCE(p."pantryProductWeightLbs", 0) * COALESCE(p."distributionAmount", 1)) AS "weightLbs",
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
        WHERE d."date" >= ${params.start}
          AND d."date" <= ${params.end}
          ${destClause}
          ${searchClause}
        ORDER BY d."date" DESC
    `;
    return rows.map(r => ({
        ...r,
        program: 'bulk_rescue' as const,
        lineId: null,
    }));
}

type JustEatsRowDb = Omit<DistributionDeliveryRow, 'program'>;

/**
 * Just Eats box lines: fixed 1 unit @ 25 lbs (display semantics per product request).
 */
export async function queryJustEatsDistributionDeliveries(
    db: Db,
    params: {
        start: Date;
        end: Date;
        search: string;
        orgFilter: string | undefined;
        partnerHouseholdId18?: string | undefined;
    }
): Promise<DistributionDeliveryRow[]> {
    const search = params.search.trim().toLowerCase();
    const searchFilter = search ? `%${search}%` : null;
    const searchClause = search
        ? Prisma.sql`
          AND (
            j."householdName" ILIKE ${searchFilter}
            OR COALESCE(j."productPackageName", '') ILIKE ${searchFilter}
          )
        `
        : Prisma.empty;

    const destClause =
        params.partnerHouseholdId18 != null && params.partnerHouseholdId18 !== ''
            ? Prisma.sql` AND j."householdId" = ${params.partnerHouseholdId18} `
            : params.orgFilter
              ? Prisma.sql` AND j."householdName" ILIKE ${params.orgFilter} `
              : Prisma.empty;

    const rows = await db.$queryRaw<JustEatsRowDb[]>`
        SELECT
            j."pantryVisitDateTime" AS "date",
            j."householdName" AS "organizationName",
            j."householdId" AS "householdId18",
            NULLIF(BTRIM(j."productPackageName"), '') AS "productName",
            1 AS "distributionAmount",
            25::double precision AS "unitWeightLbs",
            25::double precision AS "weightLbs",
            'Just Eats' AS "inventoryType",
            NULL::text AS "productType",
            NULL::boolean AS "minimallyProcessedFood",
            NULL::text AS "foodRescueProgram",
            NULL::text AS "source",
            j."distributionId18" AS "lineId"
        FROM "JustEatsBoxes" j
        WHERE j."pantryVisitDateTime" >= ${params.start}
          AND j."pantryVisitDateTime" <= ${params.end}
          ${destClause}
          ${searchClause}
        ORDER BY j."pantryVisitDateTime" DESC
    `;
    return rows.map(r => ({ ...r, program: 'just_eats' as const }));
}
