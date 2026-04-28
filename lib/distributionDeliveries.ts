import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import type { OverviewScope } from '~/lib/overviewAccess';
import {
    destinationStatusIncludedCondition,
    distributionInventoryTypeCondition,
    inventoryTxPoundsSql,
    orphanInventoryCondition,
} from '~/lib/inventoryDistributionSql';

/** Org name filter for distribution SQL (ILIKE pattern or exact normalized match via caller). */
export function distributionOrgScopeFromOverview(scope: OverviewScope): string | undefined {
    if (scope.kind === 'admin') return scope.destination;
    if (scope.kind === 'partner') return scope.destination;
    return undefined;
}

export type DistributionDeliveryRow = {
    date: Date;
    organizationName: string;
    householdId18: string | null;
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
    /** Stable id when present (Just Eats: `packageDistributionRecordId`). */
    lineId: string | null;
};

type BulkRowDb = Omit<DistributionDeliveryRow, 'program' | 'lineId'>;

type Db = Pick<PrismaClient, '$queryRaw'>;

function orphanOrgClause(params: {
    partnerHouseholdId18?: string;
    orgFilter?: string;
    destinationLabel?: string;
}): Prisma.Sql {
    const label = params.destinationLabel?.trim();
    if (params.partnerHouseholdId18 && label) {
        return Prisma.sql` AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${label})) `;
    }
    if (params.orgFilter?.trim()) {
        return Prisma.sql` AND LOWER(TRIM(COALESCE(t."destination", ''))) = LOWER(TRIM(${params.orgFilter.trim()})) `;
    }
    return Prisma.empty;
}

export async function queryDistributionDeliveries(
    db: Db,
    params: {
        start: Date;
        end: Date;
        search: string;
        orgFilter: string | undefined;
        partnerHouseholdId18?: string | undefined;
        /** Matches orphan `destination` when scoped by Salesforce household id. */
        destinationLabel?: string | undefined;
    }
): Promise<DistributionDeliveryRow[]> {
    const search = params.search.trim().toLowerCase();
    const searchFilter = search ? `%${search}%` : null;
    const searchClause = search
        ? Prisma.sql`AND COALESCE(p."pantryProductName", '') ILIKE ${searchFilter}`
        : Prisma.empty;

    const destClause =
        params.partnerHouseholdId18 != null && params.partnerHouseholdId18 !== ''
            ? Prisma.sql` AND d."householdId18" = ${params.partnerHouseholdId18} `
            : params.orgFilter
              ? Prisma.sql` AND LOWER(TRIM(COALESCE(d."householdName", ''))) = LOWER(TRIM(${params.orgFilter.trim()})) `
              : Prisma.empty;

    const orphanSearchClause = search
        ? Prisma.sql`AND COALESCE(t."pantryProductName", '') ILIKE ${searchFilter}`
        : Prisma.empty;

    const orphanOrg = orphanOrgClause({
        partnerHouseholdId18: params.partnerHouseholdId18,
        orgFilter: params.orgFilter,
        destinationLabel: params.destinationLabel,
    });

    const rows = await db.$queryRaw<BulkRowDb[]>`
        SELECT * FROM (
            SELECT
                d."date" AS "date",
                COALESCE(
                    NULLIF(BTRIM(d."householdName"), ''),
                    NULLIF(BTRIM(pt."organizationName"), '')
                ) AS "organizationName",
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
            LEFT JOIN "Partner" pt
                ON pt."householdId18" = d."householdId18"
            WHERE d."date" >= ${params.start}
              AND d."date" <= ${params.end}
              AND ${destinationStatusIncludedCondition}
              ${destClause}
              ${searchClause}

            UNION ALL

            SELECT
                t."date" AS "date",
                TRIM(t."destination") AS "organizationName",
                NULL::text AS "householdId18",
                t."pantryProductName" AS "productName",
                1 AS "distributionAmount",
                NULL::double precision AS "unitWeightLbs",
                ${inventoryTxPoundsSql()} AS "weightLbs",
                t."inventoryType" AS "inventoryType",
                t."productType" AS "productType",
                t."minimallyProcessedFood" AS "minimallyProcessedFood",
                NULL::text AS "foodRescueProgram",
                t."source" AS "source"
            FROM "AllInventoryTransactions" t
            WHERE t."date" >= ${params.start}
              AND t."date" <= ${params.end}
              AND ${distributionInventoryTypeCondition}
              AND ${orphanInventoryCondition}
              AND TRIM(COALESCE(t."destination", '')) <> ''
              ${orphanOrg}
              ${orphanSearchClause}
        ) AS combined_bulk
        ORDER BY combined_bulk."date" DESC
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
        ? Prisma.sql`AND COALESCE(j."productPackageName", '') ILIKE ${searchFilter}`
        : Prisma.empty;

    const destClause =
        params.partnerHouseholdId18 != null && params.partnerHouseholdId18 !== ''
            ? Prisma.sql` AND j."householdId" = ${params.partnerHouseholdId18} `
            : params.orgFilter
              ? Prisma.sql` AND LOWER(TRIM(COALESCE(j."householdName", ''))) = LOWER(TRIM(${params.orgFilter.trim()})) `
              : Prisma.empty;

    const rows = await db.$queryRaw<JustEatsRowDb[]>`
        SELECT
            j."pantryVisitDateTime" AS "date",
            COALESCE(
                NULLIF(BTRIM(j."householdName"), ''),
                NULLIF(BTRIM(pt."organizationName"), '')
            ) AS "organizationName",
            j."householdId" AS "householdId18",
            NULLIF(BTRIM(j."productPackageName"), '') AS "productName",
            GREATEST(
                COALESCE(j."numberPickedUp", 1),
                COALESCE(j."numberDistributed", 1)
            ) AS "distributionAmount",
            25::double precision AS "unitWeightLbs",
            (
                GREATEST(
                    COALESCE(j."numberPickedUp", 1),
                    COALESCE(j."numberDistributed", 1)
                ) * 25
            )::double precision AS "weightLbs",
            'Just Eats' AS "inventoryType",
            NULL::text AS "productType",
            NULL::boolean AS "minimallyProcessedFood",
            NULL::text AS "foodRescueProgram",
            NULL::text AS "source",
            j."packageDistributionRecordId" AS "lineId"
        FROM "JustEatsBoxes" j
        LEFT JOIN "Partner" pt
            ON pt."householdId18" = j."householdId"
        WHERE j."pantryVisitDateTime" >= ${params.start}
          AND j."pantryVisitDateTime" <= ${params.end}
          ${destClause}
          ${searchClause}
          AND NULLIF(BTRIM(j."householdName"), '') IS NOT NULL
          AND EXISTS (
              SELECT 1
              FROM (
                  SELECT LOWER(TRIM(d2."householdName")) AS org_name
                  FROM "AllProductPackageDestinations" d2
                  WHERE TRIM(COALESCE(d2."householdName", '')) <> ''

                  UNION

                  SELECT LOWER(TRIM(t2."destination")) AS org_name
                  FROM "AllInventoryTransactions" t2
                  WHERE TRIM(COALESCE(t2."destination", '')) <> ''
                    AND LOWER(TRIM(COALESCE(t2."inventoryType", ''))) = 'distribution'
              ) valid_orgs
              WHERE valid_orgs.org_name = LOWER(TRIM(j."householdName"))
          )
        ORDER BY j."pantryVisitDateTime" DESC
    `;
    return rows.map(r => ({ ...r, program: 'just_eats' as const }));
}
