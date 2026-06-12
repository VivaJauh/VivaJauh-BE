import { prisma } from '../config/prisma';
import { Prisma, type TrSyncRecord } from '../generated/prisma/client';
import type { JwtUser } from '../types/auth';

export type IncomingSyncItem = {
  id?: string;
  user_id?: string;
  device_id?: string;
  record_type?: string;
  payload_json?: Record<string, unknown>;
  idempotency_key?: string;
  recorded_at?: string;
};

export type SyncedRecord = {
  id: string;
  _id: string;
  local_id: string;
  user_id: string;
  device_id: string;
  record_type: string;
  payload_json: Prisma.JsonValue;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict';
  verification_status: 'unverified' | 'verified' | 'rejected' | 'needs_correction';
  idempotency_key: string;
  recorded_at: string;
  uploaded_at: string | null;
  error_message: string | null;
};

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

function toApiRecord(record: TrSyncRecord): SyncedRecord {
  return {
    id: record.id,
    _id: record.id,
    local_id: record.localId,
    user_id: record.userId,
    device_id: record.deviceId,
    record_type: record.recordType,
    payload_json: record.payloadJson,
    sync_status: record.syncStatus,
    verification_status: record.verificationStatus,
    idempotency_key: record.idempotencyKey,
    recorded_at: record.recordedAt.toISOString(),
    uploaded_at: record.uploadedAt?.toISOString() ?? null,
    error_message: record.errorMessage,
  };
}

function syncResult(localId: string, record: TrSyncRecord) {
  return {
    local_id: localId,
    server_id: record.id,
    idempotency_key: record.idempotencyKey,
    status: record.syncStatus,
    verification_status: record.verificationStatus,
    uploaded_at: record.uploadedAt?.toISOString() ?? null,
  };
}

async function resolveDevice(user: JwtUser, deviceIdentifier: string) {
  const tokenDevice = user.device_id
    ? await prisma.msDevice.findFirst({ where: { id: user.device_id } })
    : null;

  if (tokenDevice) return tokenDevice;

  return prisma.msDevice.upsert({
    where: { deviceIdentifier },
    update: { userId: user.sub, lastSeenAt: new Date() },
    create: {
      userId: user.sub,
      deviceIdentifier,
      deviceName: 'Flutter Device',
      lastSeenAt: new Date(),
    },
  });
}

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

export async function projectRecord(record: TrSyncRecord) {
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
}

export async function allRecords() {
  const records = await prisma.trSyncRecord.findMany({
    orderBy: { uploadedAt: 'asc' },
  });

  return records.map(toApiRecord);
}

export async function syncBatch(user: JwtUser, items: IncomingSyncItem[]) {
  const results = [];

  for (const item of items) {
    const recordedAt = item.recorded_at ? new Date(item.recorded_at) : null;
    if (!item.id || !item.idempotency_key || !item.record_type || !recordedAt || Number.isNaN(recordedAt.getTime())) {
      results.push({ local_id: item.id, status: 'failed', error_code: 'INVALID_PAYLOAD' });
      continue;
    }

    const existing = await prisma.trSyncRecord.findUnique({
      where: { idempotencyKey: item.idempotency_key },
    });

    if (existing) {
      results.push(syncResult(item.id, existing));
      continue;
    }

    const deviceIdentifier = item.device_id ?? user.device_id ?? 'unknown-device';
    const device = await resolveDevice(user, deviceIdentifier);
    const record = await prisma.trSyncRecord.create({
      data: {
        localId: item.id,
        userId: user.sub,
        deviceId: device.id,
        recordType: item.record_type,
        payloadJson: toJsonValue(item.payload_json),
        syncStatus: 'synced',
        verificationStatus: 'unverified',
        idempotencyKey: item.idempotency_key,
        recordedAt,
        uploadedAt: new Date(),
      },
    });

    await projectRecord(record);

    await prisma.trAuditLog.create({
      data: {
        userId: user.sub,
        action: 'sync_record',
        targetType: 'TrSyncRecord',
        targetId: record.id,
        resultStatus: 'synced',
        metadataJson: { record_type: item.record_type },
      },
    });

    results.push(syncResult(item.id, record));
  }

  return results;
}

export async function syncStatus() {
  const records = await allRecords();
  return {
    pending: records.filter((record) => record.sync_status === 'pending').length,
    synced: records.filter((record) => record.sync_status === 'synced').length,
    failed: records.filter((record) => record.sync_status === 'failed').length,
    conflict: records.filter((record) => record.sync_status === 'conflict').length,
    unverified: records.filter((record) => record.verification_status === 'unverified').length,
    verified: records.filter((record) => record.verification_status === 'verified').length,
    lastSyncAt: records.at(-1)?.uploaded_at ?? null,
  };
}

export async function syncItems() {
  return allRecords();
}
