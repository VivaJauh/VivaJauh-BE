import type { JsonValue } from '../../../../shared/domain/json';
import type { SyncedRecord } from '../../../../shared/domain/sync-record';
import { toApiRecord } from '../../../../shared/domain/sync-record';
import type { ReportRepository } from '../../domain/repositories/report.repository';

function numberFromPayload(payload: JsonValue, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0;
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function countByType(records: SyncedRecord[]) {
  return {
    feed_transactions: records.filter((record) => record.record_type === 'feed_transaction').length,
    livestock_events: records.filter((record) => record.record_type === 'livestock_event').length,
    seller_credit: records.filter((record) => record.record_type === 'seller_credit').length,
    savings_transactions: records.filter((record) => record.record_type === 'savings_transaction').length,
    loan_repayments: records.filter((record) => record.record_type === 'loan_repayment').length,
    daily_reports: records.filter((record) => record.record_type === 'daily_report').length,
  };
}

export function createReportUseCases(repository: ReportRepository) {
  return {
    async reportSummary() {
      const records = (await repository.findAllRecords()).map(toApiRecord);
      const verified = records.filter((record) => record.verification_status === 'verified');

      return {
        generated_at: new Date().toISOString(),
        total_records: records.length,
        verified_records: verified.length,
        unverified_records: records.filter((record) => record.verification_status === 'unverified').length,
        ...countByType(verified),
      };
    },

    async portfolioPack() {
      const verified = (await repository.findAllRecords()).map(toApiRecord).filter((record) => record.verification_status === 'verified');
      const sellerCredit = verified.filter((record) => record.record_type === 'seller_credit');
      const savings = verified.filter((record) => record.record_type === 'savings_transaction');
      const loans = verified.filter((record) => record.record_type === 'loan_repayment');
      const feed = verified.filter((record) => record.record_type === 'feed_transaction');

      return {
        generated_at: new Date().toISOString(),
        active_members_estimate: new Set(verified.map((record) => {
          if (!record.payload_json || typeof record.payload_json !== 'object' || Array.isArray(record.payload_json)) return null;
          return (record.payload_json as Record<string, unknown>).primary?.toString() ?? null;
        }).filter(Boolean)).size,
        verified_records: verified.length,
        seller_credit_total: sellerCredit.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
        savings_total: savings.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
        loan_repayment_total: loans.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
        feed_movement_kg: feed.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
        report_consistency_score: verified.length === 0 ? 0 : Math.min(100, verified.length * 10),
      };
    },

    async conflictSummary() {
      const records = (await repository.findAllRecords()).map(toApiRecord);
      return {
        generated_at: new Date().toISOString(),
        conflicts: records.filter((record) => record.sync_status === 'conflict'),
        needs_correction: records.filter((record) => record.verification_status === 'needs_correction'),
      };
    },

    async auditLogs() {
      return repository.findAuditLogs();
    },

    async auditDenied(userId: string | undefined, action: string) {
      if (!userId) return;
      await repository.createAuditLog({
        userId,
        action,
        targetType: 'Report',
        resultStatus: 'denied',
      });
    },

    async auditExportSuccess(userId: string, action: string, targetType: string) {
      await repository.createAuditLog({
        userId,
        action,
        targetType,
        resultStatus: 'success',
      });
    },
  };
}

export type ReportUseCases = ReturnType<typeof createReportUseCases>;
