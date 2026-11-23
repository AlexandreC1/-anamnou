-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "ParticipationPolicy" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "jurisdiction" VARCHAR(120) NOT NULL,
    "notice" VARCHAR(6000) NOT NULL,
    "reviewReference" VARCHAR(120) NOT NULL,
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "approvedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipationPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipationAuthorization" (
    "id" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'PENDING',
    "authority" VARCHAR(24),
    "reviewReference" VARCHAR(120),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "withdrawnAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ParticipationAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationPolicy_schoolId_version_key" ON "ParticipationPolicy"("schoolId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationPolicy_id_schoolId_key" ON "ParticipationPolicy"("id", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationAuthorization_membershipId_key" ON "ParticipationAuthorization"("membershipId");

-- CreateIndex
CREATE INDEX "ParticipationAuthorization_schoolId_status_idx" ON "ParticipationAuthorization"("schoolId", "status");

-- AddForeignKey
ALTER TABLE "ParticipationPolicy" ADD CONSTRAINT "ParticipationPolicy_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationAuthorization" ADD CONSTRAINT "ParticipationAuthorization_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "ClassMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipationAuthorization" ADD CONSTRAINT "ParticipationAuthorization_policyId_schoolId_fkey" FOREIGN KEY ("policyId", "schoolId") REFERENCES "ParticipationPolicy"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ParticipationPolicy" ADD CONSTRAINT "ParticipationPolicy_creator_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "ParticipationPolicy" ADD CONSTRAINT "ParticipationPolicy_approver_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "ParticipationAuthorization" ADD CONSTRAINT "ParticipationAuthorization_reviewer_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT;
ALTER TABLE "ParticipationPolicy" ADD CONSTRAINT "participation_policy_independent" CHECK ("createdById" IS DISTINCT FROM "approvedById");
ALTER TABLE "ParticipationPolicy" ADD CONSTRAINT "participation_policy_approval" CHECK (("approvedAt" IS NULL) = ("approvedById" IS NULL));
ALTER TABLE "ParticipationPolicy" ADD CONSTRAINT "participation_policy_validity" CHECK ("version" > 0 AND "expiresAt" > "createdAt");
ALTER TABLE "ParticipationAuthorization" ADD CONSTRAINT "participation_review_complete" CHECK (
  "status" NOT IN ('APPROVED', 'DENIED') OR
  ("reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL AND "expiresAt" > "reviewedAt" AND "reviewReference" IS NOT NULL AND "authority" IN ('SELF', 'GUARDIAN', 'INSTITUTION', 'COMBINED'))
);
ALTER TABLE "ParticipationAuthorization" ADD CONSTRAINT "participation_withdrawal_complete" CHECK ("status" != 'WITHDRAWN' OR "withdrawnAt" IS NOT NULL);

CREATE FUNCTION prevent_participation_policy_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."approvedAt" IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'Approved participation policies are immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER participation_policy_immutable BEFORE UPDATE ON "ParticipationPolicy"
FOR EACH ROW EXECUTE FUNCTION prevent_participation_policy_rewrite();

CREATE FUNCTION validate_participation_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE member_school uuid; member_user uuid;
BEGIN
  SELECT c."schoolId", m."userId" INTO member_school, member_user FROM "ClassMembership" m
  JOIN "Class" c ON c."id" = m."classId" WHERE m."id" = NEW."membershipId";
  IF member_school IS DISTINCT FROM NEW."schoolId" THEN
    RAISE EXCEPTION 'Participation policy and membership must belong to the same school';
  END IF;
  IF NEW."reviewedById" = member_user THEN
    RAISE EXCEPTION 'Participation review must be independent';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER participation_tenant BEFORE INSERT OR UPDATE ON "ParticipationAuthorization"
FOR EACH ROW EXECUTE FUNCTION validate_participation_tenant();
