-- Replace Partner synthetic id with required householdId18 key.
ALTER TABLE "Partner" ADD COLUMN "householdId18" TEXT;

-- Backfill from Clerk org id to preserve existing rows.
UPDATE "Partner"
SET "householdId18" = "clerkOrganizationId"
WHERE "householdId18" IS NULL;

ALTER TABLE "Partner" ALTER COLUMN "householdId18" SET NOT NULL;

ALTER TABLE "User" DROP CONSTRAINT "User_partnerId_fkey";

-- Re-point User.partnerId values from old Partner.id -> Partner.householdId18.
UPDATE "User" u
SET "partnerId" = p."householdId18"
FROM "Partner" p
WHERE u."partnerId" = p."id";

ALTER TABLE "Partner" DROP CONSTRAINT "Partner_pkey";

ALTER TABLE "Partner" ADD CONSTRAINT "Partner_pkey" PRIMARY KEY ("householdId18");
ALTER TABLE "Partner" DROP COLUMN "id";

ALTER TABLE "User"
ADD CONSTRAINT "User_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("householdId18")
ON DELETE SET NULL ON UPDATE CASCADE;
