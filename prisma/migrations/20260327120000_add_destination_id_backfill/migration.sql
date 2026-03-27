-- Add destinationId without failing on existing rows: add nullable, backfill, then enforce NOT NULL.
-- Backfill uses pantryVisitId18 (always present) so each row gets a value. Replace with your real
-- partner location IDs later if needed (e.g. UPDATE from ProductPackageDestination.householdId18).

ALTER TABLE "AllProductPackageDestinations" ADD COLUMN "destinationId" TEXT;

UPDATE "AllProductPackageDestinations"
SET "destinationId" = "pantryVisitId18"
WHERE "destinationId" IS NULL;

ALTER TABLE "AllProductPackageDestinations" ALTER COLUMN "destinationId" SET NOT NULL;

CREATE INDEX "AllProductPackageDestinations_destinationId_idx" ON "AllProductPackageDestinations"("destinationId");
