import { createHash } from 'crypto';
import { prisma } from '../config/prisma';
import type { MsUser } from '../generated/prisma/client';
import type { Role } from '../types/auth';
import { signToken } from '../utils/jwt';

export type RegisterInput = {
  name?: string;
  email?: string;
  password?: string;
  deviceId?: string;
};

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function buildSession(user: MsUser, deviceIdentifier: string) {
  const device = await prisma.msDevice.upsert({
    where: { deviceIdentifier },
    update: { userId: user.id, lastSeenAt: new Date() },
    create: {
      userId: user.id,
      deviceIdentifier,
      deviceName: 'Flutter Device',
      lastSeenAt: new Date(),
    },
  });

  const role = user.role as Role;
  const claims = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role,
    device_id: device.id,
  };

  return {
    token: signToken(claims),
    userId: user.id,
    name: user.name,
    email: user.email,
    role,
    deviceId: device.id,
  };
}

export async function register(input: RegisterInput) {
  const name = normalizeText(input.name);
  const email = normalizeEmail(input.email);
  const username = name.toLowerCase();
  const password = normalizeText(input.password);
  const deviceIdentifier = normalizeText(input.deviceId) || 'flutter-device';

  if (!name || name.length < 2) throw new Error('Nama wajib diisi');
  if (!username || username.length < 2) throw new Error('Nama minimal 2 karakter');
  if (!validateEmail(email)) throw new Error('Email tidak valid');
  if (password.length < 6) throw new Error('Password minimal 6 karakter');

  const existing = await prisma.msUser.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) throw new Error('Nama atau email sudah digunakan');

  const user = await prisma.msUser.create({
    data: {
      username,
      password: hashPassword(password),
      name,
      email,
      role: 'field_officer',
    },
  });

  return buildSession(user, deviceIdentifier);
}

export async function login(identifier: string, password: string, deviceIdentifier = 'flutter-device') {
  const normalizedIdentifier = normalizeText(identifier).toLowerCase();
  const user = await prisma.msUser.findFirst({
    where: {
      OR: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }],
      status: 'active',
    },
  });

  if (!user || user.password !== hashPassword(password)) {
    throw new Error('Username/email atau password salah');
  }

  return buildSession(user, deviceIdentifier);
}
