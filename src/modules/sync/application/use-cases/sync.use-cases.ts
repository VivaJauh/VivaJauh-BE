import type { JwtUser } from '../../../../shared/domain/auth';
import type { InputJsonValue } from '../../../../shared/domain/json';
import type { SyncRecord } from '../../../../shared/domain/sync-record';
import { toApiRecord } from '../../../../shared/domain/sync-record';
import type { SyncRepository } from '../../domain/repositories/sync.repository';
import type { IncomingSyncItem } from '../dto/incoming-sync-item';

function toJsonValue(value: unknown): InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as InputJsonValue;
}

function syncResult(localId: string, record: SyncRecord) {
  return {
    local_id: localId,
    server_id: record.id,
    idempotency_key: record.idempotencyKey,
    status: record.syncStatus,
    verification_status: record.verificationStatus,
    uploaded_at: record.uploadedAt?.toISOString() ?? null,
  };
}

async function resolveDevice(repository: SyncRepository, user: JwtUser, deviceIdentifier: string) {
  const tokenDevice = user.device_id
    ? await repository.findDeviceById(user.device_id)
    : null;

  if (tokenDevice) return tokenDevice;

  return repository.upsertDevice({ userId: user.sub, deviceIdentifier, now: new Date() });
}

export function createSyncUseCases(repository: SyncRepository) {
  async function allRecords() {
    const records = await repository.findAllRecords();
    return records.map(toApiRecord);
  }

  return {
    allRecords,

    async syncBatch(user: JwtUser, items: IncomingSyncItem[]) {
      const results = [];

      for (const item of items) {
        const recordedAt = item.recorded_at ? new Date(item.recorded_at) : null;
        if (!item.id || !item.idempotency_key || !item.record_type || !recordedAt || Number.isNaN(recordedAt.getTime())) {
          results.push({ local_id: item.id, status: 'failed', error_code: 'INVALID_PAYLOAD' });
          continue;
        }

        const existing = await repository.findRecordByIdempotencyKey(item.idempotency_key);

        if (existing) {
          results.push(syncResult(item.id, existing));
          continue;
        }

        const deviceIdentifier = item.device_id ?? user.device_id ?? 'unknown-device';
        const device = await resolveDevice(repository, user, deviceIdentifier);
        const record = await repository.createRecord({
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
        });

        await repository.projectRecord(record);
        await repository.createSyncAuditLog({ userId: user.sub, recordId: record.id, recordType: item.record_type });

        results.push(syncResult(item.id, record));
      }

      return results;
    },

    async syncStatus() {
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
    },

    async syncItems() {
      return allRecords();
    },
  };
}

export type SyncUseCases = ReturnType<typeof createSyncUseCases>;
