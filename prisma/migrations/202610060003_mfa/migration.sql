ALTER TABLE "User" ADD COLUMN "mfaSecret" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN "mfaEnabledAt" TIMESTAMPTZ(3);
ALTER TABLE "User" ADD COLUMN "mfaLastStep" INTEGER;
ALTER TABLE "User" ADD COLUMN "mfaPendingSecret" VARCHAR(200);
ALTER TABLE "User" ADD COLUMN "mfaPendingExpiresAt" TIMESTAMPTZ(3);
-- An enabled factor always has a secret, and a secret is never stored without being enabled.
ALTER TABLE "User" ADD CONSTRAINT "User_mfa_enabled_secret" CHECK (("mfaEnabledAt" IS NULL) = ("mfaSecret" IS NULL));
ALTER TABLE "User" ADD CONSTRAINT "User_mfa_pending_expiry" CHECK (("mfaPendingSecret" IS NULL) = ("mfaPendingExpiresAt" IS NULL));
ALTER TABLE "Session" ADD COLUMN "mfaVerifiedAt" TIMESTAMPTZ(3);

CREATE TABLE "MfaRecoveryCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "codeHash" CHAR(64) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaRecoveryCode_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MfaRecoveryCode_codeHash_key" ON "MfaRecoveryCode"("codeHash");
CREATE INDEX "MfaRecoveryCode_userId_idx" ON "MfaRecoveryCode"("userId");
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MfaChallenge" (
    "tokenHash" CHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MfaChallenge_pkey" PRIMARY KEY ("tokenHash"),
    CONSTRAINT "MfaChallenge_attempts_bounded" CHECK ("attempts" BETWEEN 0 AND 5)
);
CREATE INDEX "MfaChallenge_userId_idx" ON "MfaChallenge"("userId");
CREATE INDEX "MfaChallenge_expiresAt_idx" ON "MfaChallenge"("expiresAt");
ALTER TABLE "MfaChallenge" ADD CONSTRAINT "MfaChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
