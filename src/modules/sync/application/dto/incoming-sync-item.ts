export type IncomingSyncItem = {
  id?: string;
  user_id?: string;
  device_id?: string;
  record_type?: string;
  payload_json?: Record<string, unknown>;
  idempotency_key?: string;
  recorded_at?: string;
};
