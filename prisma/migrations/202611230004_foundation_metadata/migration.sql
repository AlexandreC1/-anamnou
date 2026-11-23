-- Operational bootstrap belongs in migrations, not a development seed. Do not
-- create users, reviewers, organizations or demonstration records in production.
INSERT INTO "SystemMetadata" ("key", "value", "updatedAt")
VALUES ('foundation_version', '1', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
