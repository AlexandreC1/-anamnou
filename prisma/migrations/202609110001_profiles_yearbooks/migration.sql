-- CreateEnum
CREATE TYPE "ProfileVisibility" AS ENUM ('PRIVATE', 'CLASS');

-- CreateEnum
CREATE TYPE "MediaPurpose" AS ENUM ('PROFILE', 'YEARBOOK');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'UPLOADED', 'READY', 'DELETED');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('COVER', 'MESSAGE', 'CLASS_PHOTO', 'MEMBERS', 'STAFF', 'QUOTES', 'GALLERY', 'ACKNOWLEDGEMENTS', 'GRADUATION');

-- CreateTable
CREATE TABLE "Profile" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "nickname" VARCHAR(80),
    "bio" VARCHAR(1000),
    "quote" VARCHAR(280),
    "activities" VARCHAR(500),
    "aspiration" VARCHAR(280),
    "contact" VARCHAR(300),
    "visibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "contactVisibility" "ProfileVisibility" NOT NULL DEFAULT 'PRIVATE',
    "photoAssetId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "purpose" "MediaPurpose" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" VARCHAR(200) NOT NULL,
    "declaredType" VARCHAR(40) NOT NULL,
    "declaredSize" INTEGER NOT NULL,
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "alt" VARCHAR(240) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Yearbook" (
    "id" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "theme" VARCHAR(16) NOT NULL DEFAULT 'PAPER',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Yearbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearbookSection" (
    "id" UUID NOT NULL,
    "yearbookId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "type" "SectionType" NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "body" VARCHAR(4000) NOT NULL DEFAULT '',
    "position" INTEGER NOT NULL,

    CONSTRAINT "YearbookSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YearbookSectionMedia" (
    "sectionId" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "classId" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "YearbookSectionMedia_pkey" PRIMARY KEY ("sectionId","assetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_membershipId_key" ON "Profile"("membershipId");

-- CreateIndex
CREATE INDEX "Profile_classId_visibility_idx" ON "Profile"("classId", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_membershipId_classId_key" ON "Profile"("membershipId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_storageKey_key" ON "MediaAsset"("storageKey");

-- CreateIndex
CREATE INDEX "MediaAsset_classId_ownerUserId_status_idx" ON "MediaAsset"("classId", "ownerUserId", "status");

-- CreateIndex
CREATE INDEX "MediaAsset_status_expiresAt_idx" ON "MediaAsset"("status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_id_classId_key" ON "MediaAsset"("id", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "Yearbook_classId_key" ON "Yearbook"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Yearbook_id_classId_key" ON "Yearbook"("id", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "YearbookSection_yearbookId_position_key" ON "YearbookSection"("yearbookId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "YearbookSection_id_classId_key" ON "YearbookSection"("id", "classId");

-- CreateIndex
CREATE INDEX "YearbookSectionMedia_assetId_classId_idx" ON "YearbookSectionMedia"("assetId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "YearbookSectionMedia_sectionId_position_key" ON "YearbookSectionMedia"("sectionId", "position");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_membershipId_classId_fkey" FOREIGN KEY ("membershipId", "classId") REFERENCES "ClassMembership"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_photoAssetId_classId_fkey" FOREIGN KEY ("photoAssetId", "classId") REFERENCES "MediaAsset"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Yearbook" ADD CONSTRAINT "Yearbook_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearbookSection" ADD CONSTRAINT "YearbookSection_yearbookId_classId_fkey" FOREIGN KEY ("yearbookId", "classId") REFERENCES "Yearbook"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearbookSectionMedia" ADD CONSTRAINT "YearbookSectionMedia_sectionId_classId_fkey" FOREIGN KEY ("sectionId", "classId") REFERENCES "YearbookSection"("id", "classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YearbookSectionMedia" ADD CONSTRAINT "YearbookSectionMedia_assetId_classId_fkey" FOREIGN KEY ("assetId", "classId") REFERENCES "MediaAsset"("id", "classId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bounds and optimistic versions remain enforced for non-API writers.
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_version_check" CHECK ("version" > 0);
ALTER TABLE "Yearbook" ADD CONSTRAINT "Yearbook_version_check" CHECK ("version" > 0), ADD CONSTRAINT "Yearbook_theme_check" CHECK ("theme" IN ('PAPER', 'INK', 'GARDEN'));
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_input_check" CHECK ("declaredSize" BETWEEN 1 AND 8388608 AND "declaredType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_processed_check" CHECK ("status" NOT IN ('UPLOADED', 'READY') OR ("size" IS NOT NULL AND "size" BETWEEN 1 AND 8388608 AND "width" IS NOT NULL AND "width" BETWEEN 1 AND 2400 AND "height" IS NOT NULL AND "height" BETWEEN 1 AND 2400));
ALTER TABLE "YearbookSection" ADD CONSTRAINT "YearbookSection_position_check" CHECK ("position" >= 0);
ALTER TABLE "YearbookSectionMedia" ADD CONSTRAINT "YearbookSectionMedia_position_check" CHECK ("position" >= 0);
