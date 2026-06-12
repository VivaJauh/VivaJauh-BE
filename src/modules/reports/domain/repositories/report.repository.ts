import type { JsonValue } from '../../../../shared/domain/json';
import type { SyncRecord } from '../../../../shared/domain/sync-record';

export type AuditLog = {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  resultStatus: string;
  metadataJson: JsonValue | null;
  createdAt: Date;
};

export type ReportRepository = {
  findAllRecords(): Promise<SyncRecord[]>;
  findAuditLogs(): Promise<AuditLog[]>;
  createAuditLog(input: { userId: string; action: string; targetType: string; resultStatus: string }): Promise<void>;
};
