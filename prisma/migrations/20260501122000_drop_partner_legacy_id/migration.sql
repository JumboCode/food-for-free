-- Remove legacy Partner.id column to align DB with current Prisma schema.
-- Partner is keyed by householdId18.
DROP INDEX IF EXISTS "Partner_id_key";
ALTER TABLE "Partner" DROP COLUMN IF EXISTS "id";
