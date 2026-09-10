CREATE TABLE "SystemMetadata" (
  "key" VARCHAR(64) NOT NULL,
  "value" VARCHAR(256) NOT NULL,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "SystemMetadata_pkey" PRIMARY KEY ("key")
);
