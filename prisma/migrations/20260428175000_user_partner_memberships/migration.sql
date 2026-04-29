-- Convert user->partner from one-to-many to many-to-many.
CREATE TABLE "UserPartnerMembership" (
    "userId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPartnerMembership_pkey" PRIMARY KEY ("userId", "partnerId")
);

CREATE INDEX "UserPartnerMembership_partnerId_idx" ON "UserPartnerMembership"("partnerId");

ALTER TABLE "UserPartnerMembership"
ADD CONSTRAINT "UserPartnerMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserPartnerMembership"
ADD CONSTRAINT "UserPartnerMembership_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("householdId18") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing single-partner links into membership rows.
INSERT INTO "UserPartnerMembership" ("userId", "partnerId")
SELECT "id", "partnerId"
FROM "User"
WHERE "partnerId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop old single-link column.
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_partnerId_fkey";
ALTER TABLE "User" DROP COLUMN IF EXISTS "partnerId";
