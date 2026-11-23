-- AlterTable
ALTER TABLE "ParticipationAuthorization" ADD COLUMN     "queueId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewQueue_id_schoolId_key" ON "ReviewQueue"("id", "schoolId");

-- AddForeignKey
ALTER TABLE "ParticipationAuthorization" ADD CONSTRAINT "ParticipationAuthorization_queueId_schoolId_fkey" FOREIGN KEY ("queueId", "schoolId") REFERENCES "ReviewQueue"("id", "schoolId") ON DELETE RESTRICT ON UPDATE CASCADE;
