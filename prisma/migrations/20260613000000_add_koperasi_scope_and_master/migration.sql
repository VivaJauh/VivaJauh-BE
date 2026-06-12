-- Historical migration reconstructed from the database state.
-- This added cooperative scope metadata before users were moved to tenantId.
ALTER TABLE "MsUser" ADD COLUMN IF NOT EXISTS "koperasiName" TEXT;

ALTER TABLE "MsTenant" ADD COLUMN IF NOT EXISTS "koperasiType" TEXT NOT NULL DEFAULT 'primer';
ALTER TABLE "MsTenant" ADD COLUMN IF NOT EXISTS "focusArea" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "MsTenant_koperasiName_key" ON "MsTenant"("koperasiName");
