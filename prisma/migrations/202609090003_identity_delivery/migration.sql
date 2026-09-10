-- CreateTable
CREATE TABLE "IdentityEmailJob" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdentityEmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IdentityEmailJob_nextAttemptAt_idx" ON "IdentityEmailJob"("nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityEmailJob_userId_purpose_key" ON "IdentityEmailJob"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "IdentityEmailJob" ADD CONSTRAINT "IdentityEmailJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
