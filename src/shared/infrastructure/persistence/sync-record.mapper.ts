import type { TrSyncRecord } from '../../../generated/prisma/client';
import type { SyncRecord } from '../../domain/sync-record';

export function mapSyncRecord(record: TrSyncRecord): SyncRecord {
  return {
    id: record.id,
    localId: record.localId,
    userId: record.userId,
    deviceId: record.deviceId,
    recordType: record.recordType,
    payloadJson: record.payloadJson as SyncRecord['payloadJson'],
    syncStatus: record.syncStatus,
    verificationStatus: record.verificationStatus,
    idempotencyKey: record.idempotencyKey,
    recordedAt: record.recordedAt,
    uploadedAt: record.uploadedAt,
    errorMessage: record.errorMessage,
  };
}
