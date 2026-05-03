CREATE TABLE "InvitationCompanionOrganizations" (
    "id" TEXT NOT NULL,
    "normalized_invitee_email" TEXT NOT NULL,
    "primary_clerk_organization_id" TEXT NOT NULL,
    "companion_clerk_organization_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationCompanionOrganizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitation_companion_email_primary_uidx" ON "InvitationCompanionOrganizations"("normalized_invitee_email", "primary_clerk_organization_id");
