import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import { mapSyncRecord } from '../../../../shared/infrastructure/persistence/sync-record.mapper';
import type { AuditLog, ReportRepository } from '../../domain/repositories/report.repository';

function toAuditLog(log: Awaited<ReturnType<typeof prisma.trAuditLog.findMany>>[number]): AuditLog {
  return {
    id: log.id,
    userId: log.userId,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    resultStatus: log.resultStatus,
    metadataJson: log.metadataJson as AuditLog['metadataJson'],
    createdAt: log.createdAt,
  };
}

export const prismaReportRepository: ReportRepository = {
  async findAllRecords() {
    const records = await prisma.trSyncRecord.findMany({
      orderBy: { uploadedAt: 'asc' },
    });

    return records.map(mapSyncRecord);
  },

  async findAuditLogs() {
    const logs = await prisma.trAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return logs.map(toAuditLog);
  },

  async createAuditLog(input) {
    await prisma.trAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: input.targetType,
        resultStatus: input.resultStatus,
      },
    });
  },
};
