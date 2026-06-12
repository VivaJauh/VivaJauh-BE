import 'dotenv/config';
import { createHash } from 'crypto';
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

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
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

  console.log('Seeded local users. Password: password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
