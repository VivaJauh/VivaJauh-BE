import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { prisma } from '../config/prisma';
import { Prisma } from '../generated/prisma/client';
import { allRecords } from './sync.service';

function numberFromPayload(payload: Prisma.JsonValue, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0;
  const value = (payload as Record<string, unknown>)[key];
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value) || 0;
  return 0;
}

function countByType(records: Awaited<ReturnType<typeof allRecords>>) {
  return {
    feed_transactions: records.filter((record) => record.record_type === 'feed_transaction').length,
    livestock_events: records.filter((record) => record.record_type === 'livestock_event').length,
    seller_credit: records.filter((record) => record.record_type === 'seller_credit').length,
    savings_transactions: records.filter((record) => record.record_type === 'savings_transaction').length,
    loan_repayments: records.filter((record) => record.record_type === 'loan_repayment').length,
    daily_reports: records.filter((record) => record.record_type === 'daily_report').length,
  };
}

export async function reportSummary() {
  const records = await allRecords();
  const verified = records.filter((record) => record.verification_status === 'verified');

  return {
    generated_at: new Date().toISOString(),
    total_records: records.length,
    verified_records: verified.length,
    unverified_records: records.filter((record) => record.verification_status === 'unverified').length,
    ...countByType(verified),
  };
}

export async function portfolioPack() {
  const verified = (await allRecords()).filter((record) => record.verification_status === 'verified');
  const sellerCredit = verified.filter((record) => record.record_type === 'seller_credit');
  const savings = verified.filter((record) => record.record_type === 'savings_transaction');
  const loans = verified.filter((record) => record.record_type === 'loan_repayment');
  const feed = verified.filter((record) => record.record_type === 'feed_transaction');

  return {
    generated_at: new Date().toISOString(),
    active_members_estimate: new Set(verified.map((record) => {
      if (!record.payload_json || typeof record.payload_json !== 'object' || Array.isArray(record.payload_json)) return null;
      return (record.payload_json as Record<string, unknown>).primary?.toString() ?? null;
    }).filter(Boolean)).size,
    verified_records: verified.length,
    seller_credit_total: sellerCredit.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
    savings_total: savings.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
    loan_repayment_total: loans.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
    feed_movement_kg: feed.reduce((sum, record) => sum + numberFromPayload(record.payload_json, 'quantity'), 0),
    report_consistency_score: verified.length === 0 ? 0 : Math.min(100, verified.length * 10),
  };
}

export async function conflictSummary() {
  const records = await allRecords();
  return {
    generated_at: new Date().toISOString(),
    conflicts: records.filter((record) => record.sync_status === 'conflict'),
    needs_correction: records.filter((record) => record.verification_status === 'needs_correction'),
  };
}

export async function auditLogs() {
  return prisma.trAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function toPdfBuffer(title: string, data: Record<string, unknown>) {
  const doc = new PDFDocument({ margin: 48 });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  doc.fontSize(18).text(title, { underline: true });
  doc.moveDown();
  for (const [key, value] of Object.entries(data)) {
    doc.fontSize(11).text(`${key}: ${Array.isArray(value) ? value.length : String(value ?? '')}`);
  }
  doc.end();
  return done;
}

export function toExcelBuffer(title: string, data: Record<string, unknown>) {
  const workbook = XLSX.utils.book_new();
  const rows = [['Report', title], [], ['Field', 'Value'], ...Object.entries(data).map(([key, value]) => [key, Array.isArray(value) ? value.length : String(value ?? '')])];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'VivaJauh Report');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function toCsv(data: Record<string, unknown>) {
  const rows = Object.entries(data).map(([key, value]) => {
    const text = Array.isArray(value) ? value.length.toString() : String(value ?? '');
    return `${escapeCsv(key)},${escapeCsv(text)}`;
  });
  return `field,value\n${rows.join('\n')}\n`;
}

function escapeCsv(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
