import { Prisma } from '@prisma/client';

/**
 * Rows in AllInventoryTransactions that never chain through packages into
 * AllProductPackageDestinations — counted separately so we do not double-count joined rows.
 */
export const orphanInventoryCondition = Prisma.sql`
  NOT EXISTS (
    SELECT 1 FROM "AllPackagesByItem" p
    INNER JOIN "AllProductPackageDestinations" d
      ON d."productPackageId18" = p."productPackageId18"
    WHERE p."productInventoryRecordId18" = t."productInventoryRecordId18"
  )
`;

/** Only distribution rows from inventory exports (exclude intake and other flows). */
export const distributionInventoryTypeCondition = Prisma.sql`
  LOWER(TRIM(COALESCE(t."inventoryType", ''))) = 'distribution'
`;

/**
 * Include destination rows by default; exclude only explicit unsuccessful outcomes.
 * Null/blank status is treated as included.
 */
export const destinationStatusIncludedCondition = Prisma.sql`
  COALESCE(NULLIF(LOWER(TRIM(COALESCE(d."distributionStatus", ''))), ''), 'unknown')
    NOT IN ('no show', 'canceled', 'cancelled')
`;

/** Pounds for an inventory transaction line (prefers Weight when present). */
export function inventoryTxPoundsSql(): Prisma.Sql {
    return Prisma.sql`COALESCE(NULLIF(t."weightLbs", 0), NULLIF(t."amount"::double precision, 0), 0)`;
}
