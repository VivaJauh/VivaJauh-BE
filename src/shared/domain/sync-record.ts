import type { JsonValue } from './json';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';

export type VerificationStatus = 'unverified' | 'verified' | 'rejected' | 'needs_correction';

export type SyncRecord = {
  id: string;
  localId: string;
  userId: string;
  deviceId: string;
  recordType: string;
  payloadJson: JsonValue;
  syncStatus: SyncStatus;
  verificationStatus: VerificationStatus;
  idempotencyKey: string;
  recordedAt: Date;
  uploadedAt: Date | null;
  errorMessage: string | null;
};

export type SyncedRecord = {
  id: string;
  _id: string;
  local_id: string;
  user_id: string;
  device_id: string;
  record_type: string;
  payload_json: JsonValue;
  sync_status: SyncStatus;
  verification_status: VerificationStatus;
  idempotency_key: string;
  recorded_at: string;
  uploaded_at: string | null;
  error_message: string | null;
};

export function toApiRecord(record: SyncRecord): SyncedRecord {
  return {
    id: record.id,
    _id: record.id,
    local_id: record.localId,
    user_id: record.userId,
    device_id: record.deviceId,
    record_type: record.recordType,
    payload_json: record.payloadJson,
    sync_status: record.syncStatus,
    verification_status: record.verificationStatus,
    idempotency_key: record.idempotencyKey,
    recorded_at: record.recordedAt.toISOString(),
    uploaded_at: record.uploadedAt?.toISOString() ?? null,
    error_message: record.errorMessage,
  };
}
