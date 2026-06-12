-- Link users to their cooperative tenant instead of storing koperasi name on users.
ALTER TABLE "MsUser" ALTER COLUMN "role" SET DEFAULT 'member';

ALTER TABLE "MsUser" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "MsTenant" ADD COLUMN IF NOT EXISTS "koperasiType" TEXT NOT NULL DEFAULT 'primer';
ALTER TABLE "MsTenant" ADD COLUMN IF NOT EXISTS "focusArea" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "MsTenant_koperasiName_key" ON "MsTenant"("koperasiName");
CREATE INDEX IF NOT EXISTS "MsUser_tenantId_idx" ON "MsUser"("tenantId");
CREATE INDEX IF NOT EXISTS "MsTenant_koperasiType_idx" ON "MsTenant"("koperasiType");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'MsUser'
      AND column_name = 'koperasiName'
  ) THEN
    EXECUTE '
      UPDATE "MsUser" AS u
      SET "tenantId" = t."id"
      FROM "MsTenant" AS t
      WHERE u."tenantId" IS NULL
        AND u."koperasiName" = t."koperasiName"
    ';
  END IF;
END $$;

ALTER TABLE "MsUser" DROP COLUMN IF EXISTS "koperasiName";

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MsUser_tenantId_fkey'
  ) THEN
    ALTER TABLE "MsUser"
      ADD CONSTRAINT "MsUser_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "MsTenant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
