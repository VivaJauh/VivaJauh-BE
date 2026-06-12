import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import { mapSyncRecord } from '../../../../shared/infrastructure/persistence/sync-record.mapper';
import type { VerificationRepository } from '../../domain/repositories/verification.repository';

export const prismaVerificationRepository: VerificationRepository = {
  async findAllRecords() {
    const records = await prisma.trSyncRecord.findMany({
      orderBy: { uploadedAt: 'asc' },
    });

    return records.map(mapSyncRecord);
  },

  async findRecordById(id) {
    const record = await prisma.trSyncRecord.findFirst({ where: { id } });
    return record ? mapSyncRecord(record) : null;
  },

  async updateVerificationStatus(id, verificationStatus) {
    const record = await prisma.trSyncRecord.update({
      where: { id },
      data: { verificationStatus },
    });

    return mapSyncRecord(record);
  },

  async createVerificationAuditLog(input) {
    await prisma.trAuditLog.create({
      data: {
        userId: input.userId,
        action: 'verify_record',
        targetType: 'TrSyncRecord',
        targetId: input.recordId,
        resultStatus: input.verificationStatus,
        metadataJson: { record_type: input.recordType },
      },
    });
  },
};
