-- CreateEnum
CREATE TYPE "FundType" AS ENUM ('principal', 'monthly_dues');

-- CreateEnum
CREATE TYPE "FundStatus" AS ENUM ('unpaid', 'partial', 'paid', 'overdue');

-- CreateTable
CREATE TABLE "TrFundLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fundType" "FundType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "amountDue" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "FundStatus" NOT NULL DEFAULT 'unpaid',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "recordedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrFundLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrFundLedger_memberId_fundType_periodKey_key" ON "TrFundLedger"("memberId", "fundType", "periodKey");

-- CreateIndex
CREATE INDEX "TrFundLedger_tenantId_idx" ON "TrFundLedger"("tenantId");

-- CreateIndex
CREATE INDEX "TrFundLedger_memberId_idx" ON "TrFundLedger"("memberId");

-- CreateIndex
CREATE INDEX "TrFundLedger_fundType_periodKey_idx" ON "TrFundLedger"("fundType", "periodKey");

-- CreateIndex
CREATE INDEX "TrFundLedger_status_idx" ON "TrFundLedger"("status");

-- AddForeignKey
ALTER TABLE "TrFundLedger" ADD CONSTRAINT "TrFundLedger_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "MsTenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrFundLedger" ADD CONSTRAINT "TrFundLedger_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrFundLedger" ADD CONSTRAINT "TrFundLedger_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "MsUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
