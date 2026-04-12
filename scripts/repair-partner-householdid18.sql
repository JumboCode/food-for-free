-- Safe repair for Partner key migration without dropping data.
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "householdId18" TEXT;

UPDATE "Partner"
SET "householdId18" = "clerkOrganizationId"
WHERE "householdId18" IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'User_partnerId_fkey'
    ) THEN
        ALTER TABLE "User" DROP CONSTRAINT "User_partnerId_fkey";
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Partner'
          AND column_name = 'id'
          AND table_schema = 'public'
    ) THEN
        UPDATE "User" u
        SET "partnerId" = p."householdId18"
        FROM "Partner" p
        WHERE u."partnerId" = p."id";
    END IF;
END
$$;

ALTER TABLE "Partner" ALTER COLUMN "householdId18" SET NOT NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Partner_pkey'
    ) THEN
        ALTER TABLE "Partner" DROP CONSTRAINT "Partner_pkey";
    END IF;
END
$$;

ALTER TABLE "Partner" ADD CONSTRAINT "Partner_pkey" PRIMARY KEY ("householdId18");

ALTER TABLE "User"
ADD CONSTRAINT "User_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "Partner"("householdId18")
ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'Partner'
          AND column_name = 'id'
          AND table_schema = 'public'
    ) THEN
        ALTER TABLE "Partner" DROP COLUMN "id";
    END IF;
END
$$;
