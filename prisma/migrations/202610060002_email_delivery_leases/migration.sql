ALTER TABLE "IdentityEmailJob" ADD COLUMN "leaseId" UUID;
ALTER TABLE "IdentityEmailJob" ADD COLUMN "failedAt" TIMESTAMPTZ(3);
