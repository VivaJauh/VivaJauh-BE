import type { JwtUser, Role } from '../../../../shared/domain/auth';

export type AuthUser = {
  id: string;
  username: string;
  password: string;
  name: string;
  email: string;
  role: Role;
  tenantId: string | null;
  koperasiName: string | null;
  koperasiType: string | null;
  status: string;
};

export type AuthTenant = {
  id: string;
  koperasiName: string;
  koperasiType: string;
};

export type AuthDevice = {
  id: string;
};

export type AuthRepository = {
  findExistingUser(username: string, email: string): Promise<AuthUser | null>;
  findTenantByName(koperasiName: string): Promise<AuthTenant | null>;
  createRegisteredUser(input: {
    username: string;
    password: string;
    name: string;
    email: string;
    tenantId: string;
  }): Promise<AuthUser>;
  findActiveUserByIdentifier(identifier: string): Promise<AuthUser | null>;
  upsertDevice(input: { userId: string; deviceIdentifier: string; now: Date }): Promise<AuthDevice>;
};

export type TokenSigner = (user: JwtUser) => string;
