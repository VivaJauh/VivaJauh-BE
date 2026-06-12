import type { JwtUser, Role } from '../../../../shared/domain/auth';

export type AuthUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: Role;
  koperasiName: string | null;
  status: string;
};

export type AuthDevice = {
  id: string;
};

export type AuthRepository = {
  findExistingUser(username: string, email: string): Promise<AuthUser | null>;
  createFieldOfficerUser(input: {
    username: string;
    password: string;
    name: string;
    email: string;
    koperasiName: string;
  }): Promise<AuthUser>;
  findActiveUserByIdentifier(identifier: string): Promise<AuthUser | null>;
  upsertDevice(input: { userId: string; deviceIdentifier: string; now: Date }): Promise<AuthDevice>;
};

export type TokenSigner = (user: JwtUser) => string;
