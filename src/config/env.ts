import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl,
};
