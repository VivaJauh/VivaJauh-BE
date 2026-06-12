import type { InputJsonValue } from '../../../../shared/domain/json';
import type { LoanApplication, LoanHistory, LoanHistoryEntry, LoanIntegrityResult, LoanRecommendation, LoanRiskLevel, LoanStatus } from '../../application/dto/loan.dto';

export type CreateLoanApplicationRepositoryInput = {
  applicantName: string;
  applicantMemberId: string | null;
  targetKoperasi: string;
  requestedAmount: number;
  purpose: string | null;
  tenureMonths: number;
  submittedBy: string;
};

export type SaveLoanRecommendationInput = {
  loanApplicationId: string;
  riskLevel: LoanRiskLevel;
  recommendation: string;
  summary: string;
  keyStatsJson: InputJsonValue;
  chartDataJson: InputJsonValue;
  evidenceJson: InputJsonValue;
  modelProvider: string;
  modelRawResponse: InputJsonValue | null;
};

export type LoanRepository = {
  createLoanApplication(input: CreateLoanApplicationRepositoryInput): Promise<LoanApplication>;
  findLoanApplicationById(id: string): Promise<LoanApplication | null>;
  findLoanApplications(status?: LoanStatus): Promise<LoanApplication[]>;
  findBorrowerHistories(applicantName: string, applicantMemberId: string | null, since: Date): Promise<LoanHistory[]>;
  saveLoanRecommendation(input: SaveLoanRecommendationInput): Promise<LoanRecommendation>;
  updateLoanDecision(input: { id: string; status: 'approved' | 'rejected'; reviewedBy: string; reviewNote: string | null; reviewedAt: Date }): Promise<LoanApplication | null>;
  createLoanAuditLog(input: { userId: string; action: string; targetId: string; resultStatus: string; metadataJson: InputJsonValue }): Promise<void>;
  findLoanAuditHistory(loanApplicationId: string, from?: Date, to?: Date): Promise<LoanHistoryEntry[]>;
  verifyLoanAuditChain(loanApplicationId: string): Promise<Omit<LoanIntegrityResult, 'loan_application_id' | 'verified_at'>>;
};
