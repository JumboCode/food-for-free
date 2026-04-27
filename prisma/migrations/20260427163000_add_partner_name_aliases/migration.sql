CREATE TABLE IF NOT EXISTS "PartnerNameAlias" (
    "id" BIGSERIAL PRIMARY KEY,
    "clerkOrganizationId" TEXT NOT NULL,
    "aliasName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerNameAlias_clerkOrganizationId_aliasName_key"
    ON "PartnerNameAlias"("clerkOrganizationId", "aliasName");

CREATE INDEX IF NOT EXISTS "PartnerNameAlias_aliasName_idx"
    ON "PartnerNameAlias"("aliasName");
