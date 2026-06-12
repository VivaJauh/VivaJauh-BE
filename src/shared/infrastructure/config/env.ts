import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl,
  jwtSecret,
  geminiApiKey: process.env.GEMINI_API_KEY,
};
