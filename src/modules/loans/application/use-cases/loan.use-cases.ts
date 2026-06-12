import { createHash } from 'crypto';
import type { GeminiLoanRecommendationClient } from '../../infrastructure/ai/gemini-loan-recommendation.client';
import type { LoanRepository } from '../../domain/repositories/loan.repository';
import type {
  CreateLoanApplicationInput,
  LoanAuditReport,
  LoanChartData,
  LoanEvidence,
  LoanHistory,
  LoanHistoryEntry,
  LoanHistoryResult,
  LoanIntegrityResult,
  LoanKeyStats,
  LoanRecommendationLabel,
  LoanRiskLevel,
  LoanStatus,
  LoanSuspiciousFlag,
} from '../dto/loan.dto';

const FAST_DECISION_THRESHOLD_MS = 30 * 60 * 1000;
const RECAP_PERIOD_MONTHS = 12;

function getRecapStartDate(now = new Date()) {
  const start = new Date(now);
  start.setMonth(start.getMonth() - RECAP_PERIOD_MONTHS);
  return start;
}

function computeSuspiciousFlags(timeline: LoanHistoryEntry[]): LoanSuspiciousFlag[] {
  const flags: LoanSuspiciousFlag[] = [];

  const creationEntry = timeline.find((e) => e.action === 'loan_application_created');
  const decisionEntry = timeline.find(
    (e) => e.action === 'loan_application_approved' || e.action === 'loan_application_rejected',
  );
  const recommendationEntry = timeline.find((e) => e.action === 'loan_recommendation_generated');

  if (decisionEntry && creationEntry) {
    const elapsed = decisionEntry.created_at.getTime() - creationEntry.created_at.getTime();
    if (elapsed < FAST_DECISION_THRESHOLD_MS) {
      flags.push('FAST_DECISION');
    }
  }

  if (decisionEntry && !recommendationEntry) {
    flags.push('RECOMMENDATION_SKIPPED');
  }

  if (decisionEntry?.action === 'loan_application_approved') {
    const riskLevel = recommendationEntry?.metadata?.risk_level;
    if (riskLevel === 'high') {
      flags.push('HIGH_RISK_APPROVED');
    }
  }

  if (decisionEntry) {
    const reviewNote = decisionEntry.metadata?.review_note;
    if (!reviewNote || reviewNote.trim() === '') {
      flags.push('MISSING_REVIEW_NOTE');
    }
  }

  return flags;
}

function computeKeyStats(histories: LoanHistory[], requestedAmount: number, recapStart: Date, recapEnd: Date): LoanKeyStats {
  const goodHistoryCount = histories.filter((h) => h.outstandingArrears === 0 && h.latePayments === 0).length;
  const arrearsCount = histories.filter((h) => h.outstandingArrears > 0).length;
  const totalRepaid = histories.reduce((s, h) => s + h.totalRepaid, 0);
  const totalArrears = histories.reduce((s, h) => s + h.outstandingArrears, 0);
  const latePaymentCount = histories.reduce((s, h) => s + h.latePayments, 0);
  const ratio = requestedAmount > 0 ? Math.round((totalArrears / requestedAmount) * 10000) / 10000 : 0;

  return {
    recap_period_months: RECAP_PERIOD_MONTHS,
    recap_start_date: recapStart.toISOString(),
    recap_end_date: recapEnd.toISOString(),
    known_cooperatives: histories.length,
    good_history_count: goodHistoryCount,
    arrears_cooperative_count: arrearsCount,
    total_repaid: totalRepaid,
    total_unresolved_arrears: totalArrears,
    late_payment_count: latePaymentCount,
    requested_amount: requestedAmount,
    arrears_to_requested_amount_ratio: ratio,
  };
}

function computeChartData(histories: LoanHistory[]): LoanChartData {
  return {
    repayment_by_cooperative: histories.map((h) => ({ label: h.koperasi, value: h.totalRepaid })),
    arrears_by_cooperative: histories.map((h) => ({ label: h.koperasi, value: h.outstandingArrears })),
    risk_factors: [
      { label: 'Riwayat pembayaran baik', value: histories.filter((h) => h.outstandingArrears === 0 && h.latePayments === 0).length },
      { label: 'Tunggakan belum selesai', value: histories.filter((h) => h.outstandingArrears > 0).length },
      { label: 'Keterlambatan pembayaran', value: histories.reduce((s, h) => s + h.latePayments, 0) },
    ],
  };
}

function computeEvidence(histories: LoanHistory[]): LoanEvidence[] {
  return histories.map((h) => ({
    koperasi: h.koperasi,
    finding:
      h.outstandingArrears > 0
        ? `Terdapat tunggakan kecil yang belum diselesaikan sebesar ${h.outstandingArrears}`
        : h.latePayments > 0
          ? `Riwayat pembayaran memiliki ${h.latePayments} keterlambatan`
          : 'Riwayat pembayaran lancar',
    loan_ref: h.loanRef,
    status: h.status,
    total_repaid: h.totalRepaid,
    late_payments: h.latePayments,
    outstanding_arrears: h.outstandingArrears,
    recorded_at: h.recordedAt.toISOString(),
  }));
}

function ruleBasedRecommendation(
  stats: LoanKeyStats,
): { riskLevel: LoanRiskLevel; recommendation: LoanRecommendationLabel; summary: string } {
  if (stats.known_cooperatives === 0) {
    return {
      riskLevel: 'medium',
      recommendation: 'manual_review',
      summary:
        'Tidak ditemukan riwayat pinjaman lintas koperasi dalam 12 bulan terakhir untuk pemohon ini. Tidak adanya riwayat bukan berarti bebas risiko - verifikasi identitas dan penilaian manual oleh secondary admin diperlukan sebelum keputusan dibuat.',
    };
  }

  if (stats.total_unresolved_arrears === 0 && stats.late_payment_count === 0) {
    return {
      riskLevel: 'low',
      recommendation: 'approve',
      summary: `Pemohon memiliki riwayat pembayaran bersih di ${stats.known_cooperatives} koperasi dalam 12 bulan terakhir. Tidak ada tunggakan atau keterlambatan pembayaran yang terdeteksi. Direkomendasikan untuk disetujui.`,
    };
  }

  if (stats.arrears_to_requested_amount_ratio <= 0.1 && stats.late_payment_count <= 1) {
    return {
      riskLevel: 'medium',
      recommendation: 'manual_review',
      summary: `Pemohon memiliki profil pembayaran campuran dalam 12 bulan terakhir: ${stats.good_history_count} koperasi dengan riwayat baik, tetapi ${stats.arrears_cooperative_count} koperasi masih memiliki tunggakan yang belum diselesaikan. Secondary admin perlu melakukan peninjauan sebelum menyetujui.`,
    };
  }

  return {
    riskLevel: 'high',
    recommendation: 'reject_or_require_clearance',
    summary: `Pemohon memiliki tunggakan belum selesai yang signifikan (${stats.total_unresolved_arrears}) dan/atau beberapa keterlambatan pembayaran dalam 12 bulan terakhir. Pelunasan atau klarifikasi diperlukan sebelum pinjaman dapat disetujui.`,
  };
}

export function createLoanUseCases(repository: LoanRepository, gemini: GeminiLoanRecommendationClient) {
  return {
    async createApplication(input: CreateLoanApplicationInput) {
      const name = typeof input.applicantName === 'string' ? input.applicantName.trim() : '';
      const targetKoperasi = typeof input.targetKoperasi === 'string' ? input.targetKoperasi.trim() : '';
      const requestedAmount = Number(input.requestedAmount);
      const tenureMonths = Number(input.tenureMonths);

      if (!name) throw new Error('INVALID_INPUT: applicant_name is required');
      if (!targetKoperasi) throw new Error('INVALID_INPUT: target_koperasi is required');
      if (!requestedAmount || requestedAmount <= 0) throw new Error('INVALID_INPUT: requested_amount must be a positive number');
      if (!tenureMonths || tenureMonths <= 0) throw new Error('INVALID_INPUT: tenure_months must be a positive number');

      const app = await repository.createLoanApplication({
        applicantName: name,
        applicantMemberId: typeof input.applicantMemberId === 'string' ? input.applicantMemberId.trim() || null : null,
        targetKoperasi,
        requestedAmount,
        purpose: typeof input.purpose === 'string' ? input.purpose.trim() || null : null,
        tenureMonths,
        submittedBy: input.submittedBy,
      });

      await repository.createLoanAuditLog({
        userId: input.submittedBy,
        action: 'loan_application_created',
        targetId: app.id,
        resultStatus: 'pending_review',
        metadataJson: {
          applicant_name: app.applicantName,
          applicant_member_id: app.applicantMemberId ?? null,
          target_koperasi: app.targetKoperasi,
          requested_amount: app.requestedAmount,
          new_status: 'pending_review',
        },
      });

      return app;
    },

    async generateRecommendation(id: string, userId: string) {
      const app = await repository.findLoanApplicationById(id);
      if (!app) return null;

      const recapEnd = new Date();
      const recapStart = getRecapStartDate(recapEnd);
      const histories: LoanHistory[] = await repository.findBorrowerHistories(
        app.applicantName,
        app.applicantMemberId,
        recapStart,
      );

      const keyStats = computeKeyStats(histories, app.requestedAmount, recapStart, recapEnd);
      const chartData = computeChartData(histories);
      const evidence = computeEvidence(histories);

      const ruleResult = ruleBasedRecommendation(keyStats);
      let riskLevel: LoanRiskLevel = ruleResult.riskLevel;
      let recommendation: LoanRecommendationLabel = ruleResult.recommendation;
      let summary: string = ruleResult.summary;
      let modelProvider = 'rule_based';
      let modelRawResponse: object | null = null;

      const geminiResult = await gemini.generate({
        applicantName: app.applicantName,
        applicantMemberId: app.applicantMemberId,
        targetKoperasi: app.targetKoperasi,
        requestedAmount: app.requestedAmount,
        purpose: app.purpose,
        tenureMonths: app.tenureMonths,
        histories,
        keyStats,
      });

      if (geminiResult) {
        modelRawResponse = geminiResult as object;
        const riskRank: Record<LoanRiskLevel, number> = { low: 0, medium: 1, high: 2 };

        if (riskRank[geminiResult.risk_level] > riskRank[riskLevel]) {
          modelProvider = 'gemini_escalated';
          riskLevel = geminiResult.risk_level;
          recommendation = geminiResult.recommendation;
          summary = geminiResult.summary;
        } else if (geminiResult.risk_level === riskLevel) {
          modelProvider = 'gemini_narrative';
          summary = geminiResult.summary;
        } else {
          modelProvider = 'rule_based_guarded';
        }
      }

      const saved = await repository.saveLoanRecommendation({
        loanApplicationId: id,
        riskLevel,
        recommendation,
        summary,
        keyStatsJson: keyStats as unknown as import('../../../../shared/domain/json').InputJsonValue,
        chartDataJson: chartData as unknown as import('../../../../shared/domain/json').InputJsonValue,
        evidenceJson: evidence as unknown as import('../../../../shared/domain/json').InputJsonValue,
        modelProvider,
        modelRawResponse: modelRawResponse as unknown as import('../../../../shared/domain/json').InputJsonValue | null,
      });

      await repository.createLoanAuditLog({
        userId,
        action: 'loan_recommendation_generated',
        targetId: id,
        resultStatus: riskLevel,
        metadataJson: {
          applicant_name: app.applicantName,
          applicant_member_id: app.applicantMemberId ?? null,
          target_koperasi: app.targetKoperasi,
          requested_amount: app.requestedAmount,
          risk_level: riskLevel,
          recommendation,
          model_provider: modelProvider,
          recap_period_months: RECAP_PERIOD_MONTHS,
          recap_start_date: recapStart.toISOString(),
          recap_end_date: recapEnd.toISOString(),
        },
      });

      return saved;
    },

    async getApplication(id: string) {
      return repository.findLoanApplicationById(id);
    },

    async listApplications(status?: LoanStatus) {
      return repository.findLoanApplications(status);
    },

    async approveApplication(
      id: string,
      reviewedBy: string,
      reviewNote: string | null,
    ) {
      const existing = await repository.findLoanApplicationById(id);
      if (!existing) return null;
      if (existing.status !== 'pending_review') {
        throw new Error(`INVALID_STATE: application has already been ${existing.status}`);
      }

      const app = await repository.updateLoanDecision({
        id,
        status: 'approved',
        reviewedBy,
        reviewNote,
        reviewedAt: new Date(),
      });
      if (!app) return null;

      await repository.createLoanAuditLog({
        userId: reviewedBy,
        action: 'loan_application_approved',
        targetId: id,
        resultStatus: 'approved',
        metadataJson: {
          applicant_name: app.applicantName,
          applicant_member_id: app.applicantMemberId ?? null,
          target_koperasi: app.targetKoperasi,
          requested_amount: app.requestedAmount,
          previous_status: 'pending_review',
          new_status: 'approved',
          review_note: reviewNote,
        },
      });

      return app;
    },

    async getLoanHistory(id: string, from?: Date, to?: Date): Promise<LoanHistoryResult | null> {
      const app = await repository.findLoanApplicationById(id);
      if (!app) return null;

      const timeline = await repository.findLoanAuditHistory(id, from, to);
      const chain = await repository.verifyLoanAuditChain(id);

      return {
        loan_application_id: id,
        generated_at: new Date().toISOString(),
        flags: computeSuspiciousFlags(timeline),
        integrity: {
          loan_application_id: id,
          ...chain,
          verified_at: new Date().toISOString(),
        },
        timeline,
      };
    },

    async verifyHistory(id: string): Promise<LoanIntegrityResult | null> {
      const app = await repository.findLoanApplicationById(id);
      if (!app) return null;

      const chain = await repository.verifyLoanAuditChain(id);
      return {
        loan_application_id: id,
        ...chain,
        verified_at: new Date().toISOString(),
      };
    },

    async exportHistoryReport(
      id: string,
      exportedBy: { id: string; name: string },
      from?: Date,
      to?: Date,
    ): Promise<LoanAuditReport | null> {
      const app = await repository.findLoanApplicationById(id);
      if (!app) return null;

      const timeline = await repository.findLoanAuditHistory(id, from, to);
      const chain = await repository.verifyLoanAuditChain(id);
      const generatedAt = new Date().toISOString();

      const report: Omit<LoanAuditReport, 'report_hash'> = {
        loan_application_id: id,
        applicant_name: app.applicantName,
        applicant_member_id: app.applicantMemberId,
        target_koperasi: app.targetKoperasi,
        requested_amount: app.requestedAmount,
        status: app.status,
        period_from: from?.toISOString() ?? null,
        period_to: to?.toISOString() ?? null,
        flags: computeSuspiciousFlags(timeline),
        integrity: {
          loan_application_id: id,
          ...chain,
          verified_at: generatedAt,
        },
        timeline,
        generated_by: exportedBy.name,
        generated_at: generatedAt,
      };

      const reportHash = createHash('sha256').update(JSON.stringify(report)).digest('hex');

      await repository.createLoanAuditLog({
        userId: exportedBy.id,
        action: 'loan_audit_report_exported',
        targetId: id,
        resultStatus: 'exported',
        metadataJson: {
          applicant_name: app.applicantName,
          target_koperasi: app.targetKoperasi,
          period_from: report.period_from,
          period_to: report.period_to,
          report_hash: reportHash,
        },
      });

      return { ...report, report_hash: reportHash };
    },

    async rejectApplication(
      id: string,
      reviewedBy: string,
      reviewNote: string | null,
    ) {
      const existing = await repository.findLoanApplicationById(id);
      if (!existing) return null;
      if (existing.status !== 'pending_review') {
        throw new Error(`INVALID_STATE: application has already been ${existing.status}`);
      }

      const app = await repository.updateLoanDecision({
        id,
        status: 'rejected',
        reviewedBy,
        reviewNote,
        reviewedAt: new Date(),
      });
      if (!app) return null;

      await repository.createLoanAuditLog({
        userId: reviewedBy,
        action: 'loan_application_rejected',
        targetId: id,
        resultStatus: 'rejected',
        metadataJson: {
          applicant_name: app.applicantName,
          applicant_member_id: app.applicantMemberId ?? null,
          target_koperasi: app.targetKoperasi,
          requested_amount: app.requestedAmount,
          previous_status: 'pending_review',
          new_status: 'rejected',
          review_note: reviewNote,
        },
      });

      return app;
    },
  };
}

export type LoanUseCases = ReturnType<typeof createLoanUseCases>;
