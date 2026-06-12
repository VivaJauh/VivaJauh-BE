import type { VerificationStatus } from '../../../../shared/domain/sync-record';
import { toApiRecord } from '../../../../shared/domain/sync-record';
import type { VerificationRepository } from '../../domain/repositories/verification.repository';

export function createVerificationUseCases(repository: VerificationRepository) {
  return {
    async verificationQueue() {
      return (await repository.findAllRecords()).map(toApiRecord).filter((record) => record.verification_status === 'unverified');
    },

    async verifyRecord(id: string, verificationStatus: VerificationStatus, userId?: string) {
      const record = await repository.findRecordById(id);
      if (!record) return null;

      const updated = await repository.updateVerificationStatus(record.id, verificationStatus);
      await repository.createVerificationAuditLog({
        userId: userId ?? record.userId,
        recordId: record.id,
        recordType: record.recordType,
        verificationStatus,
      });

      return (await repository.findAllRecords()).map(toApiRecord).find((item) => item.id === updated.id) ?? null;
    },
  };
}

export type VerificationUseCases = ReturnType<typeof createVerificationUseCases>;
