import 'dotenv/config';
import { createHash, randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type UserRole } from '../src/generated/prisma/client';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const users = [
  {
    name: 'Local Field Officer',
    email: 'field.officer@example.com',
    username: 'field_officer',
    role: 'field_officer' as UserRole,
  },
  {
    name: 'Local Remote Admin',
    email: 'remote.admin@example.com',
    username: 'remote_admin',
    role: 'remote_admin' as UserRole,
  },
];

const cooperatives = ['Padiwangi', 'Melati Jaya', 'Sumber Makmur', 'Tirta Bersama', 'Harapan Baru'];

const pakAcepHistories = [
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
        status: 'active',
      },
      create: {
        username: user.username,
        email: user.email,
        password: hashPassword('password123'),
        name: user.name,
        role: user.role,
        status: 'active',
      },
    });
  }

  for (const koperasiName of cooperatives) {
    const existing = await prisma.msTenant.findFirst({ where: { koperasiName } });
    if (!existing) {
      await prisma.msTenant.create({ data: { userId: seedUser.id, koperasiName } });
    }
  }

  for (const history of pakAcepHistories) {
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
  console.log('Seeded cooperatives:', cooperatives.join(', '));
  console.log('Seeded Pak Acep cross-cooperative loan histories.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
