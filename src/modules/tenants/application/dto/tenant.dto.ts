import type { JsonValue } from '../../../../shared/domain/json';

export type MemberSummary = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  joined_at: Date;
  record_count: number;
  savings_total: number;
  withdrawals_total: number;
  repayment_total: number;
  last_activity_at: Date | null;
};

export type TenantRecordItem = {
  id: string;
  user_id: string;
  device_id: string;
  record_type: string;
  payload_json: JsonValue;
  sync_status: string;
  idempotency_key: string;
  recorded_at: Date;
  uploaded_at: Date | null;
  error_message: string | null;
  verification_status: string;
  owner_name: string;
};

export type KoperasiSummary = {
  tenant_id: string;
  koperasi_name: string;
  koperasi_type: string;
  focus_area: string | null;
  member_count: number;
  record_count: number;
  savings_total: number;
  repayment_total: number;
  last_activity_at: Date | null;
};
