-- CreateEnum
CREATE TYPE "GovernanceRole" AS ENUM ('QUEUE_MANAGER', 'CONSENT_REVIEWER', 'SAFEGUARDING_REVIEWER', 'PRIVACY_REVIEWER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "GovernanceGrantStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'REVOKED');

-- CreateTable
CREATE TABLE "GovernanceGrant" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "requestedById" UUID NOT NULL,
    "approvedById" UUID,
    "role" "GovernanceRole" NOT NULL,
    "status" "GovernanceGrantStatus" NOT NULL DEFAULT 'REQUESTED',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "approvedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewQueue" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "role" "GovernanceRole" NOT NULL,
    "primaryGrantId" UUID NOT NULL,
    "primaryUserId" UUID NOT NULL,
    "backupGrantId" UUID NOT NULL,
    "backupUserId" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ReviewQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GovernanceGrant_schoolId_status_role_idx" ON "GovernanceGrant"("schoolId", "status", "role");

-- CreateIndex
CREATE INDEX "GovernanceGrant_userId_expiresAt_idx" ON "GovernanceGrant"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceGrant_id_schoolId_userId_key" ON "GovernanceGrant"("id", "schoolId", "userId");

-- CreateIndex
CREATE INDEX "ReviewQueue_schoolId_role_idx" ON "ReviewQueue"("schoolId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewQueue_schoolId_name_key" ON "ReviewQueue"("schoolId", "name");

-- AddForeignKey
ALTER TABLE "GovernanceGrant" ADD CONSTRAINT "GovernanceGrant_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceGrant" ADD CONSTRAINT "GovernanceGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceGrant" ADD CONSTRAINT "GovernanceGrant_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceGrant" ADD CONSTRAINT "GovernanceGrant_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewQueue" ADD CONSTRAINT "ReviewQueue_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewQueue" ADD CONSTRAINT "ReviewQueue_primaryGrantId_schoolId_primaryUserId_fkey" FOREIGN KEY ("primaryGrantId", "schoolId", "primaryUserId") REFERENCES "GovernanceGrant"("id", "schoolId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewQueue" ADD CONSTRAINT "ReviewQueue_backupGrantId_schoolId_backupUserId_fkey" FOREIGN KEY ("backupGrantId", "schoolId", "backupUserId") REFERENCES "GovernanceGrant"("id", "schoolId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;


ALTER TABLE "GovernanceGrant" ADD CONSTRAINT "GovernanceGrant_approval_check" CHECK (
  ("approvedById" IS NULL) = ("approvedAt" IS NULL)
  AND ("approvedById" IS NULL OR ("approvedById" <> "requestedById" AND "approvedById" <> "userId"))
  AND ("status" <> 'ACTIVE' OR "approvedAt" IS NOT NULL)
  AND ("status" <> 'REVOKED' OR "revokedAt" IS NOT NULL)
  AND "expiresAt" > "createdAt"
);
CREATE UNIQUE INDEX "GovernanceGrant_active_role_key" ON "GovernanceGrant" ("schoolId", "userId", "role") WHERE "status" = 'ACTIVE';
ALTER TABLE "ReviewQueue" ADD CONSTRAINT "ReviewQueue_coverage_check" CHECK (
  "primaryUserId" <> "backupUserId" AND "primaryGrantId" <> "backupGrantId" AND "version" > 0
  AND "role" IN ('CONSENT_REVIEWER', 'SAFEGUARDING_REVIEWER', 'PRIVACY_REVIEWER')
);
