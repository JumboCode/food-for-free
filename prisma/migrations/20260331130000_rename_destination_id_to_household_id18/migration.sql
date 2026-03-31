-- Rename AllProductPackageDestinations destination identifier column to householdId18.
ALTER TABLE "AllProductPackageDestinations"
RENAME COLUMN "destinationId" TO "householdId18";

-- Keep index naming consistent with renamed column.
ALTER INDEX IF EXISTS "AllProductPackageDestinations_destinationId_idx"
RENAME TO "AllProductPackageDestinations_householdId18_idx";
