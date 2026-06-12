import { prisma } from '../config/prisma';
import type { VerificationStatus } from '../generated/prisma/client';
import { allRecords } from './sync.service';

export async function verificationQueue() {
  return (await allRecords()).filter((record) => record.verification_status === 'unverified');
}

export async function verifyRecord(id: string, verificationStatus: VerificationStatus, userId?: string) {
  const record = await prisma.trSyncRecord.findFirst({ where: { id } });
  if (!record) return null;

  const updated = await prisma.trSyncRecord.update({
    where: { id: record.id },
    data: { verificationStatus },
  });

  await prisma.trAuditLog.create({
    data: {
      userId: userId ?? record.userId,
      action: 'verify_record',
      targetType: 'TrSyncRecord',
      targetId: record.id,
      resultStatus: verificationStatus,
      metadataJson: { record_type: record.recordType },
    },
  });

  return (await allRecords()).find((item) => item.id === updated.id) ?? null;
}
