import { Prisma } from '../../../../generated/prisma/client';
import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import type { LoanApplication, LoanHistory, LoanHistoryEntry, LoanHistoryEntryMetadata, LoanRecommendation, LoanStatus } from '../../application/dto/loan.dto';
import type { CreateLoanApplicationRepositoryInput, LoanRepository, SaveLoanRecommendationInput } from '../../domain/repositories/loan.repository';

type RawApplication = Awaited<ReturnType<typeof prisma.trLoanApplication.findFirst>> & {
  recommendation: Awaited<ReturnType<typeof prisma.trLoanRecommendation.findFirst>> | null;
};

function toRecommendation(r: Awaited<ReturnType<typeof prisma.trLoanRecommendation.findFirst>>): LoanRecommendation | null {
  if (!r) return null;
  return {
    id: r.id,
    loanApplicationId: r.loanApplicationId,
    riskLevel: r.riskLevel as LoanRecommendation['riskLevel'],
    recommendation: r.recommendation as LoanRecommendation['recommendation'],
    summary: r.summary,
    keyStatsJson: r.keyStatsJson as LoanRecommendation['keyStatsJson'],
    chartDataJson: r.chartDataJson as LoanRecommendation['chartDataJson'],
    evidenceJson: r.evidenceJson as LoanRecommendation['evidenceJson'],
    modelProvider: r.modelProvider,
    modelRawResponse: (r.modelRawResponse ?? null) as LoanRecommendation['modelRawResponse'],
    createdAt: r.createdAt,
  };
}

function toApplication(raw: NonNullable<RawApplication>): LoanApplication {
  return {
    id: raw.id,
    applicantName: raw.applicantName,
    applicantMemberId: raw.applicantMemberId,
    targetKoperasi: raw.targetKoperasi,
    requestedAmount: raw.requestedAmount,
    purpose: raw.purpose,
    tenureMonths: raw.tenureMonths,
    status: raw.status as LoanStatus,
    submittedBy: raw.submittedBy,
    reviewedBy: raw.reviewedBy,
    reviewedAt: raw.reviewedAt,
    reviewNote: raw.reviewNote,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    recommendation: toRecommendation(raw.recommendation),
  };
}

const includeRecommendation = { recommendation: true } as const;

export const prismaLoanRepository: LoanRepository = {
  async createLoanApplication(input: CreateLoanApplicationRepositoryInput): Promise<LoanApplication> {
    const raw = await prisma.trLoanApplication.create({
      data: {
        applicantName: input.applicantName,
        applicantMemberId: input.applicantMemberId,
        targetKoperasi: input.targetKoperasi,
        requestedAmount: input.requestedAmount,
        purpose: input.purpose,
        tenureMonths: input.tenureMonths,
        submittedBy: input.submittedBy,
      },
      include: includeRecommendation,
    });
    return toApplication(raw);
  },

  async findLoanApplicationById(id: string): Promise<LoanApplication | null> {
    const raw = await prisma.trLoanApplication.findFirst({
      where: { id },
      include: includeRecommendation,
    });
    return raw ? toApplication(raw) : null;
  },

  async findLoanApplications(status?: LoanStatus): Promise<LoanApplication[]> {
    const raw = await prisma.trLoanApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: includeRecommendation,
    });
    return raw.map(toApplication);
  },

  async findBorrowerHistories(applicantName: string, applicantMemberId: string | null): Promise<LoanHistory[]> {
    const records = await prisma.trSyncRecord.findMany({
      where: { recordType: 'loan_history' },
    });

    const normalize = (v: unknown) =>
      typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const targetName = normalize(applicantName);
    const targetMemberId = normalize(applicantMemberId);

    const withPayload = records.map((r) => ({
      payload: (r.payloadJson ?? {}) as Record<string, unknown>,
    }));

    const byMemberId = targetMemberId
      ? withPayload.filter(({ payload }) => normalize(payload.member_id) === targetMemberId)
      : [];

    const matched =
      byMemberId.length > 0
        ? byMemberId
        : withPayload.filter(({ payload }) => normalize(payload.member_name) === targetName);

    return matched.map(({ payload: p }) => ({
      koperasi: typeof p.koperasi === 'string' ? p.koperasi : '',
      loanRef: typeof p.loan_ref === 'string' ? p.loan_ref : null,
      status: typeof p.status === 'string' ? p.status : 'unknown',
      totalRepaid: typeof p.total_repaid === 'number' ? p.total_repaid : 0,
      latePayments: typeof p.late_payments === 'number' ? p.late_payments : 0,
      outstandingArrears: typeof p.outstanding_arrears === 'number' ? p.outstanding_arrears : 0,
    }));
  },

  async saveLoanRecommendation(input: SaveLoanRecommendationInput): Promise<LoanRecommendation> {
    const r = await prisma.trLoanRecommendation.upsert({
      where: { loanApplicationId: input.loanApplicationId },
      update: {
        riskLevel: input.riskLevel,
        recommendation: input.recommendation,
        summary: input.summary,
        keyStatsJson: input.keyStatsJson as Prisma.InputJsonValue,
        chartDataJson: input.chartDataJson as Prisma.InputJsonValue,
        evidenceJson: input.evidenceJson as Prisma.InputJsonValue,
        modelProvider: input.modelProvider,
        modelRawResponse: input.modelRawResponse !== null ? (input.modelRawResponse as Prisma.InputJsonValue) : Prisma.DbNull,
      },
      create: {
        loanApplicationId: input.loanApplicationId,
        riskLevel: input.riskLevel,
        recommendation: input.recommendation,
        summary: input.summary,
        keyStatsJson: input.keyStatsJson as Prisma.InputJsonValue,
        chartDataJson: input.chartDataJson as Prisma.InputJsonValue,
        evidenceJson: input.evidenceJson as Prisma.InputJsonValue,
        modelProvider: input.modelProvider,
        modelRawResponse: input.modelRawResponse !== null ? (input.modelRawResponse as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    });
    return toRecommendation(r)!;
  },

  async updateLoanDecision(input): Promise<LoanApplication | null> {
    const existing = await prisma.trLoanApplication.findFirst({ where: { id: input.id } });
    if (!existing) return null;
    const raw = await prisma.trLoanApplication.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewedBy: input.reviewedBy,
        reviewedAt: input.reviewedAt,
        reviewNote: input.reviewNote,
      },
      include: includeRecommendation,
    });
    return toApplication(raw);
  },

  async createLoanAuditLog(input): Promise<void> {
    await prisma.trAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: 'LoanApplication',
        targetId: input.targetId,
        resultStatus: input.resultStatus,
        metadataJson: input.metadataJson as Prisma.InputJsonValue,
      },
    });
  },

  async findLoanAuditHistory(loanApplicationId: string, from?: Date, to?: Date): Promise<LoanHistoryEntry[]> {
    const logs = await prisma.trAuditLog.findMany({
      where: {
        targetType: 'LoanApplication',
        targetId: loanApplicationId,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
    });

    return logs.map((log) => {
      const raw = (log.metadataJson ?? {}) as Record<string, unknown>;
      const metadata: LoanHistoryEntryMetadata = {
        applicant_name: typeof raw.applicant_name === 'string' ? raw.applicant_name : undefined,
        applicant_member_id: typeof raw.applicant_member_id === 'string' ? raw.applicant_member_id : null,
        target_koperasi: typeof raw.target_koperasi === 'string' ? raw.target_koperasi : undefined,
        requested_amount: typeof raw.requested_amount === 'number' ? raw.requested_amount : undefined,
        previous_status: typeof raw.previous_status === 'string' ? raw.previous_status : null,
        new_status: typeof raw.new_status === 'string' ? raw.new_status : null,
        risk_level: typeof raw.risk_level === 'string' ? raw.risk_level : null,
        recommendation: typeof raw.recommendation === 'string' ? raw.recommendation : null,
        review_note: typeof raw.review_note === 'string' ? raw.review_note : null,
      };
      return {
        id: log.id,
        action: log.action,
        actor_user_id: log.userId,
        result_status: log.resultStatus,
        metadata,
        created_at: log.createdAt,
      };
    });
  },
};
