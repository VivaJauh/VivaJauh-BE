import type { JwtUser } from '../../../../shared/domain/auth';
import type { InputJsonValue } from '../../../../shared/domain/json';
import type { SyncRecord } from '../../../../shared/domain/sync-record';
import { toApiRecord } from '../../../../shared/domain/sync-record';
import type { SyncRepository } from '../../domain/repositories/sync.repository';

const VALID_RECORD_TYPES = [
  'feed_transaction',
  'livestock_event',
  'savings_transaction',
  'loan_repayment',
  'seller_credit',
  'daily_report',
  'loan_history',
] as const;

const VALID_RECORD_TYPE_SET = new Set<string>(VALID_RECORD_TYPES);
const VALID_FEED_DIRECTIONS = new Set(['masuk', 'keluar']);
const VALID_SAVINGS_DIRECTIONS = new Set(['setor', 'tarik']);

type ValidRecordType = typeof VALID_RECORD_TYPES[number];

type ValidatedSyncItem = {
  localId: string;
  deviceIdentifier: string | null;
  recordType: ValidRecordType;
  payloadJson: InputJsonValue;
  idempotencyKey: string;
  recordedAt: Date;
};

type SyncValidationResult =
  | { ok: true; item: ValidatedSyncItem }
  | { ok: false; localId: string | null; errorCode: string };

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isBlank(value: unknown) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function parseFiniteNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parsePositiveNumber(value: unknown) {
  const parsed = parseFiniteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(value: unknown) {
  const parsed = parsePositiveNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function parseNonNegativeNumber(value: unknown) {
  const parsed = parseFiniteNumber(value);
  return parsed !== null && parsed >= 0 ? parsed : null;
}

function parseNonNegativeInteger(value: unknown) {
  const parsed = parseNonNegativeNumber(value);
  return parsed !== null && Number.isInteger(parsed) ? parsed : null;
}

function normalizeOptionalText(payload: Record<string, unknown>, key: string) {
  const value = normalizeText(payload[key]);
  if (value) payload[key] = value;
  else delete payload[key];
}

function normalizeRecordType(value: unknown): ValidRecordType | null {
  const recordType = normalizeText(value);
  return VALID_RECORD_TYPE_SET.has(recordType) ? (recordType as ValidRecordType) : null;
}

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

function syncFailure(localId: string | null, errorCode: string) {
  return {
    local_id: localId,
    status: 'failed' as const,
    error_code: errorCode,
  };
}

type SyncBatchResult = ReturnType<typeof syncResult> | ReturnType<typeof syncFailure>;

function validatePrimary(payload: Record<string, unknown>) {
  const primary = normalizeText(payload.primary);
  if (!primary) return 'MISSING_PRIMARY';
  payload.primary = primary;
  return null;
}

function validateQuantity(payload: Record<string, unknown>, integer = false) {
  const quantity = integer ? parsePositiveInteger(payload.quantity) : parsePositiveNumber(payload.quantity);
  if (quantity === null) return integer ? 'INVALID_INTEGER_QUANTITY' : 'INVALID_QUANTITY';
  payload.quantity = quantity;
  return null;
}

function validateProjectedPayload(recordType: ValidRecordType, payload: Record<string, unknown>) {
  const primaryError = validatePrimary(payload);
  if (primaryError) return primaryError;

  const quantityError = validateQuantity(payload, recordType === 'livestock_event');
  if (quantityError) return quantityError;

  if (recordType === 'feed_transaction') {
    const direction = normalizeText(payload.direction) || 'masuk';
    if (!VALID_FEED_DIRECTIONS.has(direction)) return 'INVALID_DIRECTION';
    payload.direction = direction;

    const expectedAdjustmentSign = direction === 'keluar' ? -1 : 1;
    if (isBlank(payload.adjustment_sign)) {
      payload.adjustment_sign = expectedAdjustmentSign;
    } else {
      const adjustmentSign = parseFiniteNumber(payload.adjustment_sign);
      if (adjustmentSign !== expectedAdjustmentSign) return 'INVALID_ADJUSTMENT_SIGN';
      payload.adjustment_sign = adjustmentSign;
    }

    normalizeOptionalText(payload, 'warehouse');
    return null;
  }

  if (recordType === 'livestock_event') {
    payload.event_type = normalizeText(payload.event_type) || 'penambahan';
    normalizeOptionalText(payload, 'pen');
    normalizeOptionalText(payload, 'health_note');
    return null;
  }

  if (recordType === 'savings_transaction') {
    const direction = normalizeText(payload.savings_direction) || 'setor';
    if (!VALID_SAVINGS_DIRECTIONS.has(direction)) return 'INVALID_SAVINGS_DIRECTION';
    payload.savings_direction = direction;
    normalizeOptionalText(payload, 'member_id');
    return null;
  }

  if (recordType === 'loan_repayment') {
    normalizeOptionalText(payload, 'member_id');
    normalizeOptionalText(payload, 'loan_ref');
    return null;
  }

  if (recordType === 'seller_credit') {
    normalizeOptionalText(payload, 'items');
    return null;
  }

  return null;
}

function validateLoanHistoryPayload(payload: Record<string, unknown>) {
  const koperasi = normalizeText(payload.koperasi);
  const memberName = normalizeText(payload.member_name);
  const memberId = normalizeText(payload.member_id);
  const totalRepaid = parseNonNegativeNumber(payload.total_repaid);
  const latePayments = parseNonNegativeInteger(payload.late_payments);
  const outstandingArrears = parseNonNegativeNumber(payload.outstanding_arrears);

  if (!koperasi) return 'MISSING_KOPERASI';
  if (!memberName && !memberId) return 'MISSING_BORROWER';
  if (totalRepaid === null) return 'INVALID_TOTAL_REPAID';
  if (latePayments === null) return 'INVALID_LATE_PAYMENTS';
  if (outstandingArrears === null) return 'INVALID_OUTSTANDING_ARREARS';

  payload.koperasi = koperasi;
  if (memberName) payload.member_name = memberName;
  else delete payload.member_name;
  if (memberId) payload.member_id = memberId;
  else delete payload.member_id;
  payload.status = normalizeText(payload.status) || 'unknown';
  payload.total_repaid = totalRepaid;
  payload.late_payments = latePayments;
  payload.outstanding_arrears = outstandingArrears;
  normalizeOptionalText(payload, 'loan_ref');
  return null;
}

function validatePayload(recordType: ValidRecordType, payload: Record<string, unknown>) {
  if (
    recordType === 'feed_transaction'
    || recordType === 'livestock_event'
    || recordType === 'savings_transaction'
    || recordType === 'loan_repayment'
    || recordType === 'seller_credit'
  ) {
    return validateProjectedPayload(recordType, payload);
  }

  if (recordType === 'loan_history') return validateLoanHistoryPayload(payload);

  return null;
}

function validateSyncItem(raw: unknown): SyncValidationResult {
  if (!isRecord(raw)) return { ok: false, localId: null, errorCode: 'INVALID_ITEM' };

  const localId = normalizeText(raw.id);
  if (!localId) return { ok: false, localId: null, errorCode: 'MISSING_LOCAL_ID' };

  const idempotencyKey = normalizeText(raw.idempotency_key);
  if (!idempotencyKey) return { ok: false, localId, errorCode: 'MISSING_IDEMPOTENCY_KEY' };

  const recordType = normalizeRecordType(raw.record_type);
  if (!recordType) return { ok: false, localId, errorCode: 'INVALID_RECORD_TYPE' };

  const recordedAtValue = normalizeText(raw.recorded_at);
  if (!recordedAtValue) return { ok: false, localId, errorCode: 'MISSING_RECORDED_AT' };

  const recordedAt = new Date(recordedAtValue);
  if (!Number.isFinite(recordedAt.getTime())) return { ok: false, localId, errorCode: 'INVALID_RECORDED_AT' };

  const payloadValue = raw.payload_json ?? {};
  if (!isRecord(payloadValue)) return { ok: false, localId, errorCode: 'INVALID_PAYLOAD_JSON' };

  const payload = { ...payloadValue };
  const payloadError = validatePayload(recordType, payload);
  if (payloadError) return { ok: false, localId, errorCode: payloadError };

  return {
    ok: true,
    item: {
      localId,
      deviceIdentifier: normalizeText(raw.device_id) || null,
      recordType,
      payloadJson: toJsonValue(payload),
      idempotencyKey,
      recordedAt,
    },
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

    async syncBatch(user: JwtUser, items: unknown[]) {
      const results: SyncBatchResult[] = [];

      for (const rawItem of items) {
        const validation = validateSyncItem(rawItem);
        if (!validation.ok) {
          results.push(syncFailure(validation.localId, validation.errorCode));
          continue;
        }

        const item = validation.item;
        const existing = await repository.findRecordByIdempotencyKey(item.idempotencyKey);

        if (existing) {
          results.push(syncResult(item.localId, existing));
          continue;
        }

        const deviceIdentifier = item.deviceIdentifier ?? user.device_id ?? 'unknown-device';
        const device = await resolveDevice(repository, user, deviceIdentifier);
        const record = await repository.createRecord({
          localId: item.localId,
          userId: user.sub,
          deviceId: device.id,
          recordType: item.recordType,
          payloadJson: item.payloadJson,
          syncStatus: 'synced',
          verificationStatus: 'unverified',
          idempotencyKey: item.idempotencyKey,
          recordedAt: item.recordedAt,
          uploadedAt: new Date(),
        });

        await repository.projectRecord(record);
        await repository.createSyncAuditLog({ userId: user.sub, recordId: record.id, recordType: item.recordType });

        results.push(syncResult(item.localId, record));
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

    async syncItems(user: JwtUser) {
      const records = await repository.findRecordsByUser(user.sub);
      return records.map(toApiRecord);
    },
  };
}

export type SyncUseCases = ReturnType<typeof createSyncUseCases>;
