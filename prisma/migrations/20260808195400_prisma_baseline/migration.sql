CREATE TABLE IF NOT EXISTS "name_entries" (
  "id" BIGSERIAL NOT NULL,
  "name_one" VARCHAR(200) NOT NULL DEFAULT '',
  "name_two" VARCHAR(200) NOT NULL DEFAULT '',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "name_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "name_entries_created_at_idx"
  ON "name_entries" ("created_at" DESC, "id" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'name_entries_at_least_one_name'
      AND conrelid = 'name_entries'::regclass
  ) THEN
    ALTER TABLE "name_entries"
      ADD CONSTRAINT "name_entries_at_least_one_name"
      CHECK (
        LENGTH(BTRIM("name_one")) > 0 OR
        LENGTH(BTRIM("name_two")) > 0
      );
  END IF;
END
$$;
