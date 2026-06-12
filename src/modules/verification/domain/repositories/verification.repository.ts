import type { SyncRecord, VerificationStatus } from '../../../../shared/domain/sync-record';

export type VerificationRepository = {
  findAllRecords(): Promise<SyncRecord[]>;
  findRecordById(id: string): Promise<SyncRecord | null>;
  updateVerificationStatus(id: string, verificationStatus: VerificationStatus): Promise<SyncRecord>;
  createVerificationAuditLog(input: { userId: string; recordId: string; recordType: string; verificationStatus: VerificationStatus }): Promise<void>;
};
