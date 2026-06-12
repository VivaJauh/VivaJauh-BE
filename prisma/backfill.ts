import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { projectRecord } from '../src/services/sync.service';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  const records = await prisma.trSyncRecord.findMany();
  for (const record of records) {
    await projectRecord(record);
  }
  console.log(`Backfill selesai: ${records.length} record diproyeksikan.`);

  const savings = await prisma.trSavingsTransaction.findMany();
  const loans = await prisma.trLoanRepayment.findMany();
  console.log('TrSavingsTransaction:');
  for (const saving of savings) {
    console.log(`  ${saving.memberName} | ${saving.direction} | Rp${saving.amount}`);
  }
  console.log('TrLoanRepayment:');
  for (const loan of loans) {
    console.log(`  ${loan.memberName} | ref=${loan.loanRef} | Rp${loan.amount}`);
  }
  await prisma.$disconnect();
}

main();
