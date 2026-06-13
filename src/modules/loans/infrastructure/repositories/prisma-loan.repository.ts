import { createHash } from 'crypto';
import { Prisma } from '../../../../generated/prisma/client';
import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import type { LoanApplication, LoanHistory, LoanHistoryEntry, LoanHistoryEntryMetadata, LoanRecommendation, LoanStatus } from '../../application/dto/loan.dto';
import type { CreateLoanApplicationRepositoryInput, LoanRepository, SaveLoanRecommendationInput } from '../../domain/repositories/loan.repository';

function computeAuditHash(input: {
  prevHash: string | null;
  userId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  resultStatus: string;
  metadataJson: unknown;
  createdAt: Date;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        prev: input.prevHash,
        user_id: input.userId,
        action: input.action,
        target_type: input.targetType,
        target_id: input.targetId,
        result_status: input.resultStatus,
        metadata: input.metadataJson ?? null,
        created_at: input.createdAt.toISOString(),
      }),
    )
    .digest('hex');
}

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

  async findBorrowerHistories(applicantName: string, applicantMemberId: string | null, since: Date): Promise<LoanHistory[]> {
    const normalize = (v: unknown) =>
      typeof v === 'string' ? v.trim().toLowerCase().replace(/\s+/g, ' ') : '';
    const targetName = normalize(applicantName);
    const targetMemberId = normalize(applicantMemberId);

    const [records, repayments] = await Promise.all([
      prisma.trSyncRecord.findMany({
        where: {
          recordType: 'loan_history',
          recordedAt: { gte: since },
        },
        orderBy: { recordedAt: 'desc' },
      }),
      prisma.trLoanRepayment.findMany({
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: 'desc' },
        include: { user: { include: { tenant: true } } },
      }),
    ]);

    const withPayload = records.map((r) => ({
      payload: (r.payloadJson ?? {}) as Record<string, unknown>,
      recordedAt: r.recordedAt,
    }));

    const byMemberId = targetMemberId
      ? withPayload.filter(({ payload }) => normalize(payload.member_id) === targetMemberId)
      : [];

    const matched =
      byMemberId.length > 0
        ? byMemberId
        : withPayload.filter(({ payload }) => normalize(payload.member_name) === targetName);

    const legacyHistories = matched.map(({ payload: p, recordedAt }) => ({
      koperasi: typeof p.koperasi === 'string' ? p.koperasi : '',
      loanRef: typeof p.loan_ref === 'string' ? p.loan_ref : null,
      status: typeof p.status === 'string' ? p.status : 'unknown',
      totalRepaid: typeof p.total_repaid === 'number' ? p.total_repaid : 0,
      latePayments: typeof p.late_payments === 'number' ? p.late_payments : 0,
      outstandingArrears: typeof p.outstanding_arrears === 'number' ? p.outstanding_arrears : 0,
      recordedAt,
    }));

    const matchedRepayments = targetMemberId
      ? repayments.filter((row) => normalize(row.memberId) === targetMemberId)
      : repayments.filter((row) => normalize(row.memberName) === targetName);

    const repaymentGroups = new Map<string, LoanHistory>();
    for (const row of matchedRepayments) {
      const koperasi = row.user.tenant?.koperasiName ?? 'Koperasi tidak diketahui';
      const loanRef = row.loanRef ?? null;
      const key = `${koperasi}|${loanRef ?? ''}`;
      const current = repaymentGroups.get(key);

      if (!current) {
        repaymentGroups.set(key, {
          koperasi,
          loanRef,
          status: 'good_history',
          totalRepaid: row.amount,
          latePayments: 0,
          outstandingArrears: 0,
          recordedAt: row.recordedAt,
        });
        continue;
      }

      current.totalRepaid += row.amount;
      if (row.recordedAt > current.recordedAt) current.recordedAt = row.recordedAt;
    }

    return [...legacyHistories, ...repaymentGroups.values()].sort(
      (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
    );
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
    const previous = await prisma.trAuditLog.findFirst({
      where: { targetType: 'LoanApplication', targetId: input.targetId },
      orderBy: { createdAt: 'desc' },
      select: { selfHash: true },
    });

    const createdAt = new Date();
    const prevHash = previous?.selfHash ?? null;
    const selfHash = computeAuditHash({
      prevHash,
      userId: input.userId,
      action: input.action,
      targetType: 'LoanApplication',
      targetId: input.targetId,
      resultStatus: input.resultStatus,
      metadataJson: input.metadataJson,
      createdAt,
    });

    await prisma.trAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: 'LoanApplication',
        targetId: input.targetId,
        resultStatus: input.resultStatus,
        metadataJson: input.metadataJson as Prisma.InputJsonValue,
        prevHash,
        selfHash,
        createdAt,
      },
    });
  },

  async verifyLoanAuditChain(loanApplicationId: string) {
    const logs = await prisma.trAuditLog.findMany({
      where: { targetType: 'LoanApplication', targetId: loanApplicationId },
      orderBy: { createdAt: 'asc' },
    });

    let checked = 0;
    let legacy = 0;
    let expectedPrev: string | null = null;
    let hasHashedEntry = false;

    for (const log of logs) {
      if (!log.selfHash) {
        legacy += 1;
        continue;
      }

      const recomputed = computeAuditHash({
        prevHash: log.prevHash,
        userId: log.userId,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        resultStatus: log.resultStatus,
        metadataJson: log.metadataJson,
        createdAt: log.createdAt,
      });

      const chainLinked = !hasHashedEntry || log.prevHash === expectedPrev;
      if (recomputed !== log.selfHash || !chainLinked) {
        return {
          integrity: 'broken' as const,
          checked_entries: checked,
          legacy_entries: legacy,
          broken_at_entry_id: log.id,
        };
      }

      expectedPrev = log.selfHash;
      hasHashedEntry = true;
      checked += 1;
    }

    return {
      integrity: 'valid' as const,
      checked_entries: checked,
      legacy_entries: legacy,
      broken_at_entry_id: null,
    };
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

    const actorIds = [...new Set(logs.map((log) => log.userId))];
    const actors = await prisma.msUser.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, role: true },
    });
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));

    return logs.map((log) => {
      const actor = actorById.get(log.userId);
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
        recap_period_months: typeof raw.recap_period_months === 'number' ? raw.recap_period_months : undefined,
        recap_start_date: typeof raw.recap_start_date === 'string' ? raw.recap_start_date : null,
        recap_end_date: typeof raw.recap_end_date === 'string' ? raw.recap_end_date : null,
        period_from: typeof raw.period_from === 'string' ? raw.period_from : null,
        period_to: typeof raw.period_to === 'string' ? raw.period_to : null,
        report_hash: typeof raw.report_hash === 'string' ? raw.report_hash : null,
      };
      return {
        id: log.id,
        action: log.action,
        actor_user_id: log.userId,
        actor_name: actor?.name ?? 'Pengguna tidak dikenal',
        actor_role: actor?.role ?? 'unknown',
        result_status: log.resultStatus,
        metadata,
        self_hash: log.selfHash,
        created_at: log.createdAt,
      };
    });
  },
};
