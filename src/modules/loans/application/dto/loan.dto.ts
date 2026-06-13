import type { JsonValue } from '../../../../shared/domain/json';

export type LoanStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type LoanRiskLevel = 'low' | 'medium' | 'high';
export type LoanRecommendationLabel = 'approve' | 'manual_review' | 'reject_or_require_clearance';
export type LoanApprovalRole = 'primary_admin' | 'secondary_admin';

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
  recordedAt: Date;
};

export type LoanKeyStats = {
  recap_period_months: 12;
  recap_start_date: string;
  recap_end_date: string;
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
  recorded_at: string;
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
  approvalRole: LoanApprovalRole;
  submittedBy: string;
  submitterTenantId: string | null;
  submitterKoperasiName: string | null;
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
  recap_period_months?: number;
  recap_start_date?: string | null;
  recap_end_date?: string | null;
  period_from?: string | null;
  period_to?: string | null;
  report_hash?: string | null;
};

export type LoanHistoryEntry = {
  id: string;
  action: string;
  actor_user_id: string;
  actor_name: string;
  actor_role: string;
  result_status: string;
  metadata: LoanHistoryEntryMetadata;
  self_hash: string | null;
  created_at: Date;
};

export type LoanIntegrityResult = {
  loan_application_id: string;
  integrity: 'valid' | 'broken';
  checked_entries: number;
  legacy_entries: number;
  broken_at_entry_id: string | null;
  verified_at: string;
};

export type LoanHistoryResult = {
  loan_application_id: string;
  generated_at: string;
  flags: LoanSuspiciousFlag[];
  integrity: LoanIntegrityResult;
  timeline: LoanHistoryEntry[];
};

export type LoanAuditReport = {
  loan_application_id: string;
  applicant_name: string;
  applicant_member_id: string | null;
  target_koperasi: string;
  requested_amount: number;
  status: LoanStatus;
  period_from: string | null;
  period_to: string | null;
  flags: LoanSuspiciousFlag[];
  integrity: LoanIntegrityResult;
  timeline: LoanHistoryEntry[];
  generated_by: string;
  generated_at: string;
  report_hash: string;
};

export type GeminiLoanRecommendation = {
  risk_level: LoanRiskLevel;
  recommendation: LoanRecommendationLabel;
  summary: string;
  positive_factors?: string[];
  negative_factors?: string[];
  suggested_conditions?: string[];
};
