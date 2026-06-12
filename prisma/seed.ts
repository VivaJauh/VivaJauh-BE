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

  await upsertUser({
    name: 'Pak Hendra',
    email: 'pak.hendra@example.com',
    username: 'pak_hendra',
    role: 'member',
    tenantId: harapanBaruTenantId,
  });

  await upsertUser({
    name: 'Primary Admin Harapan Baru',
    email: 'primary.harapanbaru@example.com',
    username: 'primary_harapanbaru',
    role: 'primary_admin',
    tenantId: harapanBaruTenantId,
  });

  await upsertUser({
    name: 'Secondary Admin Nusantara',
    email: 'secondary.admin@example.com',
    username: 'secondary_admin',
    role: 'secondary_admin',
    tenantId: secondaryTenant.id,
  });

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

  console.log('Seeded demo users. Password: password123');
  console.log('  member: pak_hendra / pak.hendra@example.com');
  console.log('  primary_admin: primary_harapanbaru / primary.harapanbaru@example.com');
  console.log('  secondary_admin: secondary_admin / secondary.admin@example.com');
  console.log('Seeded primary cooperatives:', primaryCooperatives.map((c) => c.name).join(', '));
  console.log('Seeded Pak Hendra histories: one good, one minor arrears within 12 months, one old ignored record.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
