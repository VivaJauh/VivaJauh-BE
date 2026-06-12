import type { JsonValue } from '../../../../shared/domain/json';

export type LoanStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type LoanRiskLevel = 'low' | 'medium' | 'high';
export type LoanRecommendationLabel = 'approve' | 'manual_review' | 'reject_or_require_clearance';

export type CreateLoanApplicationInput = {
  applicantName?: string;
  applicantMemberId?: string;
  targetKoperasi?: string;
  requestedAmount?: number;
  purpose?: string;
  tenureMonths?: number;
  submittedBy: string;
};

export type LoanHistory = {
  koperasi: string;
  loanRef: string | null;
  status: string;
  totalRepaid: number;
  latePayments: number;
  outstandingArrears: number;
};

export type LoanKeyStats = {
  known_cooperatives: number;
  good_history_count: number;
  arrears_cooperative_count: number;
  total_repaid: number;
  total_unresolved_arrears: number;
  late_payment_count: number;
  requested_amount: number;
  arrears_to_requested_amount_ratio: number;
};

export type LoanChartData = {
  repayment_by_cooperative: { label: string; value: number }[];
  arrears_by_cooperative: { label: string; value: number }[];
  risk_factors: { label: string; value: number }[];
};

export type LoanEvidence = {
  koperasi: string;
  finding: string;
  loan_ref: string | null;
  status: string;
  total_repaid: number;
  late_payments: number;
  outstanding_arrears: number;
};

export type LoanRecommendation = {
  id: string;
  loanApplicationId: string;
  riskLevel: LoanRiskLevel;
  recommendation: LoanRecommendationLabel;
  summary: string;
  keyStatsJson: JsonValue;
  chartDataJson: JsonValue;
  evidenceJson: JsonValue;
  modelProvider: string;
  modelRawResponse: JsonValue | null;
  createdAt: Date;
};

export type LoanApplication = {
  id: string;
  applicantName: string;
  applicantMemberId: string | null;
  targetKoperasi: string;
  requestedAmount: number;
  purpose: string | null;
  tenureMonths: number;
  status: LoanStatus;
  submittedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  recommendation: LoanRecommendation | null;
};

export type LoanSuspiciousFlag =
  | 'HIGH_RISK_APPROVED'
  | 'MISSING_REVIEW_NOTE'
  | 'FAST_DECISION'
  | 'RECOMMENDATION_SKIPPED';

export type LoanHistoryEntryMetadata = {
  applicant_name?: string;
  applicant_member_id?: string | null;
  target_koperasi?: string;
  requested_amount?: number;
  previous_status?: string | null;
  new_status?: string | null;
  risk_level?: string | null;
  recommendation?: string | null;
  review_note?: string | null;
};

export type LoanHistoryEntry = {
  id: string;
  action: string;
  actor_user_id: string;
  result_status: string;
  metadata: LoanHistoryEntryMetadata;
  created_at: Date;
};

export type LoanHistoryResult = {
  loan_application_id: string;
  generated_at: string;
  flags: LoanSuspiciousFlag[];
  timeline: LoanHistoryEntry[];
};

export type GeminiLoanRecommendation = {
  risk_level: LoanRiskLevel;
  recommendation: LoanRecommendationLabel;
  summary: string;
  positive_factors?: string[];
  negative_factors?: string[];
  suggested_conditions?: string[];
};
