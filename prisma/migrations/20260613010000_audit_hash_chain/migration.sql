-- Tamper-evident audit chain
ALTER TABLE "TrAuditLog" ADD COLUMN IF NOT EXISTS "prevHash" TEXT;
ALTER TABLE "TrAuditLog" ADD COLUMN IF NOT EXISTS "selfHash" TEXT;
CREATE INDEX IF NOT EXISTS "TrAuditLog_targetType_targetId_idx" ON "TrAuditLog"("targetType", "targetId");
