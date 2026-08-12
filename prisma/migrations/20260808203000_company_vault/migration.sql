CREATE TABLE IF NOT EXISTS "project_secrets" (
  "id" BIGSERIAL PRIMARY KEY,
  "project_name" VARCHAR(200) NOT NULL,
  "github_url" VARCHAR(500) NOT NULL DEFAULT '',
  "encrypted_payload" TEXT NOT NULL,
  "iv" VARCHAR(64) NOT NULL,
  "auth_tag" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "project_secrets_project_name_idx"
  ON "project_secrets" ("project_name");

CREATE INDEX IF NOT EXISTS "project_secrets_created_at_idx"
  ON "project_secrets" ("created_at" DESC, "id" DESC);

CREATE TABLE IF NOT EXISTS "admin_credentials" (
  "id" BIGSERIAL PRIMARY KEY,
  "software_name" VARCHAR(200) NOT NULL,
  "admin_url" VARCHAR(500) NOT NULL DEFAULT '',
  "encrypted_payload" TEXT NOT NULL,
  "iv" VARCHAR(64) NOT NULL,
  "auth_tag" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "admin_credentials_software_name_idx"
  ON "admin_credentials" ("software_name");

CREATE INDEX IF NOT EXISTS "admin_credentials_created_at_idx"
  ON "admin_credentials" ("created_at" DESC, "id" DESC);
