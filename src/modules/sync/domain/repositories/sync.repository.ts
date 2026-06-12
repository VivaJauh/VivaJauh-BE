import type { InputJsonValue } from '../../../../shared/domain/json';
import type { SyncRecord } from '../../../../shared/domain/sync-record';

export type SyncDevice = {
  id: string;
};

export type CreateSyncRecordInput = {
  localId: string;
  userId: string;
  deviceId: string;
  recordType: string;
  payloadJson: InputJsonValue;
  syncStatus: 'synced';
  verificationStatus: 'unverified';
  idempotencyKey: string;
  recordedAt: Date;
  uploadedAt: Date;
};

export type SyncRepository = {
  findDeviceById(id: string): Promise<SyncDevice | null>;
  upsertDevice(input: { userId: string; deviceIdentifier: string; now: Date }): Promise<SyncDevice>;
  findRecordByIdempotencyKey(idempotencyKey: string): Promise<SyncRecord | null>;
  createRecord(input: CreateSyncRecordInput): Promise<SyncRecord>;
  projectRecord(record: SyncRecord): Promise<void>;
  createSyncAuditLog(input: { userId: string; recordId: string; recordType: string }): Promise<void>;
  findAllRecords(): Promise<SyncRecord[]>;
};
