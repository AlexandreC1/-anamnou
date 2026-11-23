-- CreateTable
CREATE TABLE "ParticipationEvent" (
    "id" UUID NOT NULL,
    "authorizationId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" VARCHAR(32) NOT NULL,
    "version" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipationEvent_schoolId_createdAt_idx" ON "ParticipationEvent"("schoolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationEvent_authorizationId_version_key" ON "ParticipationEvent"("authorizationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipationAuthorization_id_schoolId_key" ON "ParticipationAuthorization"("id", "schoolId");

-- AddForeignKey
ALTER TABLE "ParticipationEvent" ADD CONSTRAINT "ParticipationEvent_authorizationId_schoolId_fkey" FOREIGN KEY ("authorizationId", "schoolId") REFERENCES "ParticipationAuthorization"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
