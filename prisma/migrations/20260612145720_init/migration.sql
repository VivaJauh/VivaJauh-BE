-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('field_officer', 'remote_admin');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'syncing', 'synced', 'failed', 'conflict');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('unverified', 'verified', 'rejected', 'needs_correction');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "LoanRiskLevel" AS ENUM ('low', 'medium', 'high');

-- CreateTable
CREATE TABLE "MsUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'field_officer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MsTenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "koperasiName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MsDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceIdentifier" TEXT NOT NULL,
    "deviceName" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'flutter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MsDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrSyncRecord" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'synced',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'unverified',
    "idempotencyKey" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrSyncRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrFeedTransaction" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedType" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'masuk',
    "quantityKg" DOUBLE PRECISION NOT NULL,
    "adjustmentSign" INTEGER NOT NULL DEFAULT 1,
    "warehouse" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrFeedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrLivestockEvent" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "livestockType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'penambahan',
    "quantity" DOUBLE PRECISION NOT NULL,
    "pen" TEXT,
    "healthNote" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrLivestockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrSavingsTransaction" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberId" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'setor',
    "amount" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrSavingsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrLoanRepayment" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "memberId" TEXT,
    "loanRef" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrLoanRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrSellerCredit" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerName" TEXT NOT NULL,
    "items" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrSellerCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrLoanApplication" (
    "id" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantMemberId" TEXT,
    "targetKoperasi" TEXT NOT NULL,
    "requestedAmount" DOUBLE PRECISION NOT NULL,
    "purpose" TEXT,
    "tenureMonths" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'pending_review',
    "submittedBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrLoanApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrLoanRecommendation" (
    "id" TEXT NOT NULL,
    "loanApplicationId" TEXT NOT NULL,
    "riskLevel" "LoanRiskLevel" NOT NULL,
    "recommendation" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keyStatsJson" JSONB NOT NULL,
    "chartDataJson" JSONB NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "modelProvider" TEXT NOT NULL DEFAULT 'rule_based',
    "modelRawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrLoanRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "resultStatus" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MsUser_username_key" ON "MsUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "MsUser_email_key" ON "MsUser"("email");

-- CreateIndex
CREATE INDEX "MsTenant_userId_idx" ON "MsTenant"("userId");

-- CreateIndex
CREATE INDEX "MsTenant_koperasiName_idx" ON "MsTenant"("koperasiName");

-- CreateIndex
CREATE UNIQUE INDEX "MsDevice_deviceIdentifier_key" ON "MsDevice"("deviceIdentifier");

-- CreateIndex
CREATE INDEX "TrSyncRecord_recordType_idx" ON "TrSyncRecord"("recordType");

-- CreateIndex
CREATE INDEX "TrSyncRecord_verificationStatus_idx" ON "TrSyncRecord"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TrSyncRecord_idempotencyKey_key" ON "TrSyncRecord"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "TrFeedTransaction_recordId_key" ON "TrFeedTransaction"("recordId");

-- CreateIndex
CREATE INDEX "TrFeedTransaction_feedType_idx" ON "TrFeedTransaction"("feedType");

-- CreateIndex
CREATE UNIQUE INDEX "TrLivestockEvent_recordId_key" ON "TrLivestockEvent"("recordId");

-- CreateIndex
CREATE INDEX "TrLivestockEvent_livestockType_idx" ON "TrLivestockEvent"("livestockType");

-- CreateIndex
CREATE UNIQUE INDEX "TrSavingsTransaction_recordId_key" ON "TrSavingsTransaction"("recordId");

-- CreateIndex
CREATE INDEX "TrSavingsTransaction_memberName_idx" ON "TrSavingsTransaction"("memberName");

-- CreateIndex
CREATE UNIQUE INDEX "TrLoanRepayment_recordId_key" ON "TrLoanRepayment"("recordId");

-- CreateIndex
CREATE INDEX "TrLoanRepayment_memberName_idx" ON "TrLoanRepayment"("memberName");

-- CreateIndex
CREATE UNIQUE INDEX "TrSellerCredit_recordId_key" ON "TrSellerCredit"("recordId");

-- CreateIndex
CREATE INDEX "TrSellerCredit_sellerName_idx" ON "TrSellerCredit"("sellerName");

-- CreateIndex
CREATE INDEX "TrLoanApplication_applicantName_idx" ON "TrLoanApplication"("applicantName");

-- CreateIndex
CREATE INDEX "TrLoanApplication_targetKoperasi_idx" ON "TrLoanApplication"("targetKoperasi");

-- CreateIndex
CREATE INDEX "TrLoanApplication_status_idx" ON "TrLoanApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TrLoanRecommendation_loanApplicationId_key" ON "TrLoanRecommendation"("loanApplicationId");

-- AddForeignKey
ALTER TABLE "MsTenant" ADD CONSTRAINT "MsTenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MsDevice" ADD CONSTRAINT "MsDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrSyncRecord" ADD CONSTRAINT "TrSyncRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrSyncRecord" ADD CONSTRAINT "TrSyncRecord_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MsDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrFeedTransaction" ADD CONSTRAINT "TrFeedTransaction_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrSyncRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrFeedTransaction" ADD CONSTRAINT "TrFeedTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrLivestockEvent" ADD CONSTRAINT "TrLivestockEvent_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrSyncRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrLivestockEvent" ADD CONSTRAINT "TrLivestockEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrSavingsTransaction" ADD CONSTRAINT "TrSavingsTransaction_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrSyncRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrSavingsTransaction" ADD CONSTRAINT "TrSavingsTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrLoanRepayment" ADD CONSTRAINT "TrLoanRepayment_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrSyncRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrLoanRepayment" ADD CONSTRAINT "TrLoanRepayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrSellerCredit" ADD CONSTRAINT "TrSellerCredit_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "TrSyncRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrSellerCredit" ADD CONSTRAINT "TrSellerCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrLoanApplication" ADD CONSTRAINT "TrLoanApplication_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "MsUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrLoanRecommendation" ADD CONSTRAINT "TrLoanRecommendation_loanApplicationId_fkey" FOREIGN KEY ("loanApplicationId") REFERENCES "TrLoanApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
