export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type InputJsonValue = string | number | boolean | InputJsonValue[] | { [key: string]: InputJsonValue | null };
