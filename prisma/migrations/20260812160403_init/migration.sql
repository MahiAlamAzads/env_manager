-- AlterTable
ALTER TABLE "admin_credentials" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "name_entries" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "project_secrets" ALTER COLUMN "updated_at" DROP DEFAULT;
