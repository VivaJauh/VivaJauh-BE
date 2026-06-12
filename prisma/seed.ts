import 'dotenv/config';
import { createHash, randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type UserRole } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const cooperatives = [
  { name: 'Padiwangi', focusArea: 'Simpan pinjam & beras' },
  { name: 'Melati Jaya', focusArea: 'Sayuran & cold storage' },
  { name: 'Sumber Makmur', focusArea: 'Pupuk & toko gerai' },
  { name: 'Tirta Bersama', focusArea: 'Air bersih & simpan pinjam' },
  { name: 'Harapan Baru', focusArea: 'Ternak & pakan' },
];

const users = [
  {
    name: 'Petugas Harapan Baru',
    email: 'field.officer@example.com',
    username: 'field_officer',
    role: 'field_officer' as UserRole,
    koperasiName: 'Harapan Baru' as string | null,
  },
  {
    name: 'Pengurus Harapan Baru',
    email: 'pengurus.harapanbaru@example.com',
    username: 'pengurus_harapanbaru',
    role: 'remote_admin' as UserRole,
    koperasiName: 'Harapan Baru' as string | null,
  },
  {
    name: 'Admin Koperasi Sekunder',
    email: 'remote.admin@example.com',
    username: 'remote_admin',
    role: 'remote_admin' as UserRole,
    koperasiName: null as string | null,
  },
];

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
  },
  {
    koperasi: 'Tirta Bersama',
    loan_ref: 'TRB-Acep-001',
    status: 'minor_arrears',
    member_name: 'Pak Acep',
    member_id: 'Acep-001',
    total_repaid: 1800000,
    late_payments: 1,
    outstanding_arrears: 250000,
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
  },
];

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  const seedUser = await prisma.msUser.upsert({
    where: { email: 'seed.system@example.com' },
    update: {},
    create: {
      username: 'seed_system',
      email: 'seed.system@example.com',
      password: hashPassword(randomUUID()),
      name: 'Seed System',
      role: 'remote_admin',
      status: 'active',
    },
  });

  const seedDevice = await prisma.msDevice.upsert({
    where: { deviceIdentifier: 'seed-device' },
    update: {},
    create: {
      userId: seedUser.id,
      deviceIdentifier: 'seed-device',
      deviceName: 'Seed Device',
    },
  });

  for (const user of users) {
    await prisma.msUser.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        name: user.name,
        role: user.role,
        koperasiName: user.koperasiName,
        status: 'active',
      },
      create: {
        username: user.username,
        email: user.email,
        password: hashPassword('password123'),
        name: user.name,
        role: user.role,
        koperasiName: user.koperasiName,
        status: 'active',
      },
    });
  }

  for (const koperasi of cooperatives) {
    await prisma.msTenant.upsert({
      where: { koperasiName: koperasi.name },
      update: { focusArea: koperasi.focusArea, koperasiType: 'primer' },
      create: {
        userId: seedUser.id,
        koperasiName: koperasi.name,
        koperasiType: 'primer',
        focusArea: koperasi.focusArea,
      },
    });
  }

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
          payloadJson: history,
          syncStatus: 'synced',
          verificationStatus: 'verified',
          idempotencyKey,
          recordedAt: new Date(),
          uploadedAt: new Date(),
        },
      });
    }
  }

  console.log('Seeded local users. Password: password123');
  console.log('Seeded cooperatives:', cooperatives.map((c) => c.name).join(', '));
  console.log('Seeded cross-cooperative loan histories for Pak Acep and Pak Hendra.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
