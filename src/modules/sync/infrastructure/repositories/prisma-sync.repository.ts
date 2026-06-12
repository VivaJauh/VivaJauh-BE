import type { Prisma } from '../../../../generated/prisma/client';
import type { SyncRecord } from '../../../../shared/domain/sync-record';
import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import { mapSyncRecord } from '../../../../shared/infrastructure/persistence/sync-record.mapper';
import type { SyncRepository } from '../../domain/repositories/sync.repository';

function payloadText(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function payloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

export const prismaSyncRepository: SyncRepository = {
  async findDeviceById(id) {
    const device = await prisma.msDevice.findFirst({ where: { id } });
    return device ? { id: device.id } : null;
  },

  async upsertDevice(input) {
    const device = await prisma.msDevice.upsert({
      where: { deviceIdentifier: input.deviceIdentifier },
      update: { userId: input.userId, lastSeenAt: input.now },
      create: {
        userId: input.userId,
        deviceIdentifier: input.deviceIdentifier,
        deviceName: 'Flutter Device',
        lastSeenAt: input.now,
      },
    });

    return { id: device.id };
  },

  async findRecordByIdempotencyKey(idempotencyKey) {
    const record = await prisma.trSyncRecord.findUnique({ where: { idempotencyKey } });
    return record ? mapSyncRecord(record) : null;
  },

  async createRecord(input) {
    const record = await prisma.trSyncRecord.create({
      data: {
        localId: input.localId,
        userId: input.userId,
        deviceId: input.deviceId,
        recordType: input.recordType,
        payloadJson: input.payloadJson as Prisma.InputJsonValue,
        syncStatus: input.syncStatus,
        verificationStatus: input.verificationStatus,
        idempotencyKey: input.idempotencyKey,
        recordedAt: input.recordedAt,
        uploadedAt: input.uploadedAt,
      },
    });

    return mapSyncRecord(record);
  },

  async projectRecord(record: SyncRecord) {
    const payload = (record.payloadJson ?? {}) as Record<string, unknown>;
    const base = {
      recordId: record.id,
      userId: record.userId,
      recordedAt: record.recordedAt,
    };
    const primary = payloadText(payload, 'primary') ?? '-';
    const quantity = payloadNumber(payload, 'quantity');

    switch (record.recordType) {
      case 'feed_transaction':
        await prisma.trFeedTransaction.upsert({
          where: { recordId: record.id },
          update: {},
          create: {
            ...base,
            feedType: primary,
            direction: payloadText(payload, 'direction') ?? 'masuk',
            quantityKg: quantity,
            adjustmentSign: payloadNumber(payload, 'adjustment_sign') < 0 ? -1 : 1,
            warehouse: payloadText(payload, 'warehouse'),
          },
        });
        break;
      case 'livestock_event':
        await prisma.trLivestockEvent.upsert({
          where: { recordId: record.id },
          update: {},
          create: {
            ...base,
            livestockType: primary,
            eventType: payloadText(payload, 'event_type') ?? 'penambahan',
            quantity,
            pen: payloadText(payload, 'pen'),
            healthNote: payloadText(payload, 'health_note'),
          },
        });
        break;
      case 'savings_transaction':
        await prisma.trSavingsTransaction.upsert({
          where: { recordId: record.id },
          update: {},
          create: {
            ...base,
            memberName: primary,
            memberId: payloadText(payload, 'member_id'),
            direction: payloadText(payload, 'savings_direction') ?? 'setor',
            amount: quantity,
          },
        });
        break;
      case 'loan_repayment':
        await prisma.trLoanRepayment.upsert({
          where: { recordId: record.id },
          update: {},
          create: {
            ...base,
            memberName: primary,
            memberId: payloadText(payload, 'member_id'),
            loanRef: payloadText(payload, 'loan_ref'),
            amount: quantity,
          },
        });
        break;
      case 'seller_credit':
        await prisma.trSellerCredit.upsert({
          where: { recordId: record.id },
          update: {},
          create: {
            ...base,
            sellerName: primary,
            items: payloadText(payload, 'items'),
            amount: quantity,
          },
        });
        break;
    }
  },

  async createSyncAuditLog(input) {
    await prisma.trAuditLog.create({
      data: {
        userId: input.userId,
        action: 'sync_record',
        targetType: 'TrSyncRecord',
        targetId: input.recordId,
        resultStatus: 'synced',
        metadataJson: { record_type: input.recordType },
      },
    });
  },

  async findAllRecords() {
    const records = await prisma.trSyncRecord.findMany({
      orderBy: { uploadedAt: 'asc' },
    });

    return records.map(mapSyncRecord);
  },
};
