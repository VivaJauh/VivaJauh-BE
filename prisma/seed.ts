import 'dotenv/config';
import { createHash, randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type UserRole } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const primaryCooperatives = [
  { name: 'Padiwangi', focusArea: 'Beras, panen, dan simpan pinjam' },
  { name: 'Melati Jaya', focusArea: 'Sayuran dan cold storage' },
  { name: 'Sumber Makmur', focusArea: 'Pupuk dan gerai tani' },
  { name: 'Tirta Bersama', focusArea: 'Air bersih dan simpan pinjam' },
  { name: 'Harapan Baru', focusArea: 'Ternak dan pakan' },
];

const secondaryCooperative = {
  name: 'Koperasi Sekunder Nusantara',
  focusArea: 'Approval pembiayaan dan monitoring risiko lintas koperasi',
};

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function currentPeriod() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function firstDayOfCurrentMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

async function upsertUser(input: {
  name: string;
  email: string;
  username: string;
  role: UserRole;
  tenantId: string;
}) {
  return prisma.msUser.upsert({
    where: { email: input.email },
    update: {
      username: input.username,
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      status: 'active',
    },
    create: {
      username: input.username,
      email: input.email,
      password: hashPassword('password123'),
      name: input.name,
      role: input.role,
      tenantId: input.tenantId,
      status: 'active',
    },
  });
}

async function upsertFundLedger(input: {
  tenantId: string;
  memberId: string;
  fundType: 'principal' | 'monthly_dues';
  periodKey: string;
  amountDue: number;
  amountPaid: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  dueDate: Date;
  recordedBy: string;
  note?: string;
}) {
  const paidAt = input.amountPaid > 0 ? daysAgo(2) : null;
  await prisma.trFundLedger.upsert({
    where: {
      memberId_fundType_periodKey: {
        memberId: input.memberId,
        fundType: input.fundType,
        periodKey: input.periodKey,
      },
    },
    update: {
      tenantId: input.tenantId,
      amountDue: input.amountDue,
      amountPaid: input.amountPaid,
      status: input.status,
      dueDate: input.dueDate,
      paidAt,
      recordedBy: input.amountPaid > 0 ? input.recordedBy : null,
      note: input.note ?? null,
    },
    create: {
      tenantId: input.tenantId,
      memberId: input.memberId,
      fundType: input.fundType,
      periodKey: input.periodKey,
      amountDue: input.amountDue,
      amountPaid: input.amountPaid,
      status: input.status,
      dueDate: input.dueDate,
      paidAt,
      recordedBy: input.amountPaid > 0 ? input.recordedBy : null,
      note: input.note ?? null,
    },
  });
}

async function main() {
  const seedUser = await prisma.msUser.upsert({
    where: { email: 'seed.system@example.com' },
    update: { role: 'secondary_admin', status: 'active' },
    create: {
      username: 'seed_system',
      email: 'seed.system@example.com',
      password: hashPassword(randomUUID()),
      name: 'Seed System',
      role: 'secondary_admin',
      status: 'active',
    },
  });

  const secondaryTenant = await prisma.msTenant.upsert({
    where: { koperasiName: secondaryCooperative.name },
    update: {
      userId: seedUser.id,
      koperasiType: 'sekunder',
      focusArea: secondaryCooperative.focusArea,
    },
    create: {
      userId: seedUser.id,
      koperasiName: secondaryCooperative.name,
      koperasiType: 'sekunder',
      focusArea: secondaryCooperative.focusArea,
    },
  });

  await prisma.msUser.update({
    where: { id: seedUser.id },
    data: { tenantId: secondaryTenant.id },
  });

  const tenants = new Map<string, string>();
  for (const koperasi of primaryCooperatives) {
    const tenant = await prisma.msTenant.upsert({
      where: { koperasiName: koperasi.name },
      update: {
        userId: seedUser.id,
        koperasiType: 'primer',
        focusArea: koperasi.focusArea,
      },
      create: {
        userId: seedUser.id,
        koperasiName: koperasi.name,
        koperasiType: 'primer',
        focusArea: koperasi.focusArea,
      },
    });
    tenants.set(koperasi.name, tenant.id);
  }

  const harapanBaruTenantId = tenants.get('Harapan Baru');
  if (!harapanBaruTenantId) throw new Error('Harapan Baru tenant was not seeded');

  const hendra = await upsertUser({
    name: 'Pak Hendra',
    email: 'pak.hendra@example.com',
    username: 'pak_hendra',
    role: 'member',
    tenantId: harapanBaruTenantId,
  });

  const memberUsers = [
    { name: 'Bu Sari', email: 'bu.sari@example.com', username: 'bu_sari', koperasi: 'Harapan Baru' },
    { name: 'Pak Joko', email: 'pak.joko@example.com', username: 'pak_joko', koperasi: 'Harapan Baru' },
    { name: 'Pak Acep', email: 'pak.acep@example.com', username: 'pak_acep', koperasi: 'Padiwangi' },
    { name: 'Bu Rina', email: 'bu.rina@example.com', username: 'bu_rina', koperasi: 'Tirta Bersama' },
  ];

  const memberByUsername = new Map<string, { id: string; name: string; tenantId: string }>();
  memberByUsername.set('pak_hendra', { id: hendra.id, name: hendra.name, tenantId: harapanBaruTenantId });
  for (const member of memberUsers) {
    const tenantId = tenants.get(member.koperasi);
    if (!tenantId) continue;
    const user = await upsertUser({
      name: member.name,
      email: member.email,
      username: member.username,
      role: 'member',
      tenantId,
    });
    memberByUsername.set(member.username, { id: user.id, name: user.name, tenantId });
  }

  const primaryAdmin = await upsertUser({
    name: 'Primary Admin Harapan Baru',
    email: 'primary.harapanbaru@example.com',
    username: 'primary_harapanbaru',
    role: 'primary_admin',
    tenantId: harapanBaruTenantId,
  });

  const secondaryAdmin = await upsertUser({
    name: 'Secondary Admin Nusantara',
    email: 'secondary.admin@example.com',
    username: 'secondary_admin',
    role: 'secondary_admin',
    tenantId: secondaryTenant.id,
  });

  const periodKey = currentPeriod();
  const monthlyDueDate = firstDayOfCurrentMonth();
  const fundScenarios = [
    { username: 'pak_hendra', principalPaid: 100000, monthlyPaid: 0, monthlyStatus: 'overdue' as const },
    { username: 'bu_sari', principalPaid: 50000, monthlyPaid: 25000, monthlyStatus: 'paid' as const },
    { username: 'pak_joko', principalPaid: 0, monthlyPaid: 0, monthlyStatus: 'overdue' as const },
    { username: 'pak_acep', principalPaid: 100000, monthlyPaid: 25000, monthlyStatus: 'paid' as const },
    { username: 'bu_rina', principalPaid: 100000, monthlyPaid: 10000, monthlyStatus: 'partial' as const },
  ];

  for (const scenario of fundScenarios) {
    const member = memberByUsername.get(scenario.username);
    if (!member) continue;

    await upsertFundLedger({
      tenantId: member.tenantId,
      memberId: member.id,
      fundType: 'principal',
      periodKey: 'principal',
      amountDue: 100000,
      amountPaid: scenario.principalPaid,
      status: scenario.principalPaid >= 100000 ? 'paid' : scenario.principalPaid > 0 ? 'partial' : 'overdue',
      dueDate: monthsAgo(2),
      recordedBy: primaryAdmin.id,
      note: scenario.principalPaid >= 100000 ? 'Dana pokok lunas dari seed demo' : 'Dana pokok belum lunas',
    });

    await upsertFundLedger({
      tenantId: member.tenantId,
      memberId: member.id,
      fundType: 'monthly_dues',
      periodKey,
      amountDue: 25000,
      amountPaid: scenario.monthlyPaid,
      status: scenario.monthlyStatus,
      dueDate: monthlyDueDate,
      recordedBy: member.tenantId === harapanBaruTenantId ? primaryAdmin.id : secondaryAdmin.id,
      note: 'Iuran bulanan jatuh tempo setiap tanggal 1',
    });
  }

  const seedDevice = await prisma.msDevice.upsert({
    where: { deviceIdentifier: 'seed-device' },
    update: { userId: seedUser.id },
    create: {
      userId: seedUser.id,
      deviceIdentifier: 'seed-device',
      deviceName: 'Seed Device',
    },
  });

  const loanHistories = [
    {
      koperasi: 'Padiwangi',
      loan_ref: 'PDW-Acep-001',
      status: 'good_history',
      member_name: 'Pak Acep',
      member_id: 'Acep-001',
      total_repaid: 5000000,
      late_payments: 0,
      outstanding_arrears: 0,
      recorded_at: monthsAgo(3),
    },
    {
      koperasi: 'Sumber Makmur',
      loan_ref: 'SMK-Acep-001',
      status: 'good_history',
      member_name: 'Pak Acep',
      member_id: 'Acep-001',
      total_repaid: 3200000,
      late_payments: 0,
      outstanding_arrears: 0,
      recorded_at: monthsAgo(7),
    },
    {
      koperasi: 'Padiwangi',
      loan_ref: 'PDW-Hendra-001',
      status: 'good_history',
      member_name: 'Pak Hendra',
      member_id: 'Hendra-001',
      total_repaid: 4200000,
      late_payments: 0,
      outstanding_arrears: 0,
      recorded_at: monthsAgo(2),
    },
    {
      koperasi: 'Tirta Bersama',
      loan_ref: 'TRB-Hendra-001',
      status: 'minor_arrears',
      member_name: 'Pak Hendra',
      member_id: 'Hendra-001',
      total_repaid: 1500000,
      late_payments: 1,
      outstanding_arrears: 200000,
      recorded_at: monthsAgo(5),
    },
    {
      koperasi: 'Melati Jaya',
      loan_ref: 'MLT-Hendra-OLD',
      status: 'old_good_history',
      member_name: 'Pak Hendra',
      member_id: 'Hendra-001',
      total_repaid: 2500000,
      late_payments: 0,
      outstanding_arrears: 0,
      recorded_at: monthsAgo(14),
    },
  ];

  for (const history of loanHistories) {
    const idempotencyKey = `loan_history-${history.member_id}-${history.loan_ref}`;
    const existing = await prisma.trSyncRecord.findUnique({ where: { idempotencyKey } });
    if (!existing) {
      await prisma.trSyncRecord.create({
        data: {
          localId: idempotencyKey,
          userId: seedUser.id,
          deviceId: seedDevice.id,
          recordType: 'loan_history',
          payloadJson: {
            koperasi: history.koperasi,
            loan_ref: history.loan_ref,
            status: history.status,
            member_name: history.member_name,
            member_id: history.member_id,
            total_repaid: history.total_repaid,
            late_payments: history.late_payments,
            outstanding_arrears: history.outstanding_arrears,
          },
          syncStatus: 'synced',
          verificationStatus: 'verified',
          idempotencyKey,
          recordedAt: history.recorded_at,
          uploadedAt: new Date(),
        },
      });
    }
  }

  const activities: {
    username: string;
    recordType: string;
    payload: Record<string, unknown>;
    days: number;
  }[] = [
    { username: 'pak_hendra', recordType: 'savings_transaction', days: 40, payload: { primary: 'Pak Hendra', member_id: 'Hendra-001', savings_direction: 'setor', quantity: 500000 } },
    { username: 'pak_hendra', recordType: 'savings_transaction', days: 12, payload: { primary: 'Pak Hendra', member_id: 'Hendra-001', savings_direction: 'setor', quantity: 250000 } },
    { username: 'pak_hendra', recordType: 'loan_repayment', days: 20, payload: { primary: 'Pak Hendra', member_id: 'Hendra-001', loan_ref: 'PDW-Hendra-001', quantity: 350000 } },
    { username: 'pak_hendra', recordType: 'feed_transaction', days: 9, payload: { primary: 'Konsentrat', direction: 'masuk', quantity: 120, warehouse: 'Gudang Utama' } },
    { username: 'bu_sari', recordType: 'savings_transaction', days: 30, payload: { primary: 'Bu Sari', member_id: 'Sari-001', savings_direction: 'setor', quantity: 300000 } },
    { username: 'bu_sari', recordType: 'feed_transaction', days: 7, payload: { primary: 'Dedak', direction: 'masuk', quantity: 80, warehouse: 'Gudang Utama' } },
    { username: 'bu_sari', recordType: 'livestock_event', days: 15, payload: { primary: 'Kambing', event_type: 'penambahan', quantity: 4, pen: 'Kandang B' } },
    { username: 'pak_joko', recordType: 'savings_transaction', days: 25, payload: { primary: 'Pak Joko', member_id: 'Joko-001', savings_direction: 'setor', quantity: 450000 } },
    { username: 'pak_joko', recordType: 'savings_transaction', days: 5, payload: { primary: 'Pak Joko', member_id: 'Joko-001', savings_direction: 'tarik', quantity: 100000 } },
    { username: 'pak_joko', recordType: 'livestock_event', days: 11, payload: { primary: 'Sapi', event_type: 'penambahan', quantity: 2, pen: 'Kandang A' } },
    { username: 'pak_acep', recordType: 'savings_transaction', days: 35, payload: { primary: 'Pak Acep', member_id: 'Acep-001', savings_direction: 'setor', quantity: 600000 } },
    { username: 'pak_acep', recordType: 'loan_repayment', days: 18, payload: { primary: 'Pak Acep', member_id: 'Acep-001', loan_ref: 'PDW-Acep-001', quantity: 400000 } },
    { username: 'bu_rina', recordType: 'savings_transaction', days: 22, payload: { primary: 'Bu Rina', member_id: 'Rina-001', savings_direction: 'setor', quantity: 200000 } },
    { username: 'bu_rina', recordType: 'savings_transaction', days: 6, payload: { primary: 'Bu Rina', member_id: 'Rina-001', savings_direction: 'tarik', quantity: 50000 } },
  ];

  for (const [index, activity] of activities.entries()) {
    const owner = memberByUsername.get(activity.username);
    if (!owner) continue;

    const idempotencyKey = `seed-activity-${activity.username}-${index}`;
    const existing = await prisma.trSyncRecord.findUnique({ where: { idempotencyKey } });
    if (existing) continue;

    const recordedAt = daysAgo(activity.days);
    const payload = {
      ...activity.payload,
      note: '',
      officer: owner.name,
      schema_version: 2,
    };

    const record = await prisma.trSyncRecord.create({
      data: {
        localId: idempotencyKey,
        userId: owner.id,
        deviceId: seedDevice.id,
        recordType: activity.recordType,
        payloadJson: payload,
        syncStatus: 'synced',
        verificationStatus: 'verified',
        idempotencyKey,
        recordedAt,
        uploadedAt: new Date(),
      },
    });

    const base = { recordId: record.id, userId: owner.id, recordedAt };
    const quantity = Number(activity.payload.quantity ?? 0);
    const primary = String(activity.payload.primary ?? '-');

    switch (activity.recordType) {
      case 'feed_transaction':
        await prisma.trFeedTransaction.create({
          data: {
            ...base,
            feedType: primary,
            direction: String(activity.payload.direction ?? 'masuk'),
            quantityKg: quantity,
            warehouse: String(activity.payload.warehouse ?? ''),
          },
        });
        break;
      case 'livestock_event':
        await prisma.trLivestockEvent.create({
          data: {
            ...base,
            livestockType: primary,
            eventType: String(activity.payload.event_type ?? 'penambahan'),
            quantity,
            pen: String(activity.payload.pen ?? ''),
          },
        });
        break;
      case 'savings_transaction':
        await prisma.trSavingsTransaction.create({
          data: {
            ...base,
            memberName: primary,
            memberId: String(activity.payload.member_id ?? ''),
            direction: String(activity.payload.savings_direction ?? 'setor'),
            amount: quantity,
          },
        });
        break;
      case 'loan_repayment':
        await prisma.trLoanRepayment.create({
          data: {
            ...base,
            memberName: primary,
            memberId: String(activity.payload.member_id ?? ''),
            loanRef: String(activity.payload.loan_ref ?? ''),
            amount: quantity,
          },
        });
        break;
    }
  }

  console.log('Seeded demo users. Password: password123');
  console.log('  member: pak_hendra / pak.hendra@example.com');
  console.log('  primary_admin: primary_harapanbaru / primary.harapanbaru@example.com');
  console.log('  secondary_admin: secondary_admin / secondary.admin@example.com');
  console.log('Seeded primary cooperatives:', primaryCooperatives.map((c) => c.name).join(', '));
  console.log('Seeded members: bu_sari, pak_joko (Harapan Baru), pak_acep (Padiwangi), bu_rina (Tirta Bersama).');
  console.log('Seeded dana pokok and monthly iuran ledgers for current period:', periodKey);
  console.log('Seeded member activity records for tenant summaries.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
