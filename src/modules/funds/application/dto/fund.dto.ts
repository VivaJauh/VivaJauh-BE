export type FundType = 'principal' | 'monthly_dues';
export type FundStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';
export type FundScope = 'member' | 'primary' | 'secondary';

export type FundMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  joinedAt: Date;
};

export type FundLedgerRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  fundType: FundType;
  periodKey: string;
  amountDue: number;
  amountPaid: number;
  status: FundStatus;
  dueDate: Date;
  paidAt: Date | null;
  recordedBy: string | null;
  recorderName: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FundOverviewItem = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_type: string;
  member_id: string;
  member_name: string;
  member_email: string;
  fund_type: FundType;
  label: string;
  period_key: string;
  amount_due: number;
  amount_paid: number;
  outstanding_amount: number;
  status: FundStatus;
  due_date: string;
  paid_at: string | null;
  recorded_by: string | null;
  recorder_name: string | null;
  note: string | null;
};

export type FundOverviewTotals = {
  member_count: number;
  obligation_count: number;
  principal_due_total: number;
  monthly_due_total: number;
  paid_total: number;
  outstanding_total: number;
  overdue_total: number;
};

export type FundOverview = {
  generated_at: string;
  scope: FundScope;
  current_period: string;
  iuran_due_date: string;
  principal_amount: number;
  monthly_dues_amount: number;
  totals: FundOverviewTotals;
  items: FundOverviewItem[];
};

export type RecordFundPaymentInput = {
  actorUserId: string;
  actorRole: string;
  actorTenantId: string | null | undefined;
  memberId?: string;
  fundType?: string;
  periodKey?: string;
  amount?: number;
  note?: string | null;
};
