import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

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
