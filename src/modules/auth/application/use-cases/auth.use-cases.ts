import { createHash } from 'crypto';
import type { JwtUser } from '../../../../shared/domain/auth';
import type { AuthRepository, AuthUser, TokenSigner } from '../../domain/repositories/auth.repository';

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

async function buildSession(repository: AuthRepository, tokenSigner: TokenSigner, user: AuthUser, deviceIdentifier: string) {
  const device = await repository.upsertDevice({ userId: user.id, deviceIdentifier, now: new Date() });
  const claims: JwtUser = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    device_id: device.id,
  };

  return {
    token: tokenSigner(claims),
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    deviceId: device.id,
  };
}

export function createAuthUseCases(repository: AuthRepository, tokenSigner: TokenSigner) {
  return {
    async register(input: RegisterInput) {
      const name = normalizeText(input.name);
      const email = normalizeEmail(input.email);
      const username = name.toLowerCase();
      const password = normalizeText(input.password);
      const deviceIdentifier = normalizeText(input.deviceId) || 'flutter-device';

      if (!name || name.length < 2) throw new Error('Nama wajib diisi');
      if (!username || username.length < 2) throw new Error('Nama minimal 2 karakter');
      if (!validateEmail(email)) throw new Error('Email tidak valid');
      if (password.length < 6) throw new Error('Password minimal 6 karakter');

      const existing = await repository.findExistingUser(username, email);
      if (existing) throw new Error('Nama atau email sudah digunakan');

      const user = await repository.createFieldOfficerUser({
        username,
        password: hashPassword(password),
        name,
        email,
      });

      return buildSession(repository, tokenSigner, user, deviceIdentifier);
    },

    async login(identifier: string, password: string, deviceIdentifier = 'flutter-device') {
      const normalizedIdentifier = normalizeText(identifier).toLowerCase();
      const user = await repository.findActiveUserByIdentifier(normalizedIdentifier);

      if (!user || user.password !== hashPassword(password)) {
        throw new Error('Username/email atau password salah');
      }

      return buildSession(repository, tokenSigner, user, deviceIdentifier);
    },
  };
}

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;
