import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
import { config } from '../config/env';

declare global {
  var prismaClient: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: config.databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = global.prismaClient ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prismaClient = prisma;
}
