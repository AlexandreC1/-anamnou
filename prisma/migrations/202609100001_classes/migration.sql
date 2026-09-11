-- CreateEnum
CREATE TYPE "ClassRole" AS ENUM ('MEMBER', 'CLASS_ADMIN', 'STAFF', 'GUEST');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "classId" UUID,
ADD COLUMN     "schoolId" UUID;

-- CreateTable
CREATE TABLE "School" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "location" VARCHAR(120),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolAdmin" (
    "schoolId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchoolAdmin_pkey" PRIMARY KEY ("schoolId","userId")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "motto" VARCHAR(240),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMembership" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ClassRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ClassMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "role" "ClassRole" NOT NULL DEFAULT 'MEMBER',
    "status" "InvitationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "maxUses" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationAcceptance" (
    "invitationId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationAcceptance_pkey" PRIMARY KEY ("invitationId","membershipId")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_slug_key" ON "School"("slug");

-- CreateIndex
CREATE INDEX "SchoolAdmin_userId_idx" ON "SchoolAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_slug_key" ON "Class"("schoolId", "slug");

-- CreateIndex
CREATE INDEX "ClassMembership_userId_status_idx" ON "ClassMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "ClassMembership_classId_status_role_idx" ON "ClassMembership"("classId", "status", "role");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMembership_classId_userId_key" ON "ClassMembership"("classId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMembership_id_classId_key" ON "ClassMembership"("id", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_classId_createdAt_idx" ON "Invitation"("classId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_id_classId_key" ON "Invitation"("id", "classId");

-- CreateIndex
CREATE INDEX "InvitationAcceptance_membershipId_classId_idx" ON "InvitationAcceptance"("membershipId", "classId");

-- CreateIndex
CREATE INDEX "AuditLog_schoolId_createdAt_idx" ON "AuditLog"("schoolId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_classId_createdAt_idx" ON "AuditLog"("classId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAdmin" ADD CONSTRAINT "SchoolAdmin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolAdmin" ADD CONSTRAINT "SchoolAdmin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMembership" ADD CONSTRAINT "ClassMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationAcceptance" ADD CONSTRAINT "InvitationAcceptance_invitationId_classId_fkey" FOREIGN KEY ("invitationId", "classId") REFERENCES "Invitation"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationAcceptance" ADD CONSTRAINT "InvitationAcceptance_membershipId_classId_fkey" FOREIGN KEY ("membershipId", "classId") REFERENCES "ClassMembership"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Business invariants that Prisma cannot express as check constraints.
ALTER TABLE "School" ADD CONSTRAINT "School_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") >= 2);
ALTER TABLE "Class" ADD CONSTRAINT "Class_slug_format" CHECK ("slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("slug") >= 2);
ALTER TABLE "Class" ADD CONSTRAINT "Class_year_range" CHECK ("graduationYear" BETWEEN 1900 AND 2200);
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_usage_bounds" CHECK ("maxUses" BETWEEN 1 AND 500 AND "usedCount" BETWEEN 0 AND "maxUses");
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_no_admin" CHECK ("role" <> 'CLASS_ADMIN');
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_hash_format" CHECK ("tokenHash" ~ '^[a-f0-9]{64}$');
