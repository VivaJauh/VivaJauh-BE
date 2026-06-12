import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import type { AuthRepository, AuthUser } from '../../domain/repositories/auth.repository';

type UserWithTenant = NonNullable<Awaited<ReturnType<typeof prisma.msUser.findFirst>>> & {
  tenant: { id: string; koperasiName: string; koperasiType: string } | null;
};

const includeTenant = { tenant: true } as const;

function toAuthUser(user: UserWithTenant | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    koperasiName: user.tenant?.koperasiName ?? null,
    koperasiType: user.tenant?.koperasiType ?? null,
    status: user.status,
  };
}

export const prismaAuthRepository: AuthRepository = {
  async findExistingUser(username, email) {
    return toAuthUser(await prisma.msUser.findFirst({
      where: { OR: [{ username }, { email }] },
      include: includeTenant,
    }));
  },

  async findTenantByName(koperasiName) {
    const tenant = await prisma.msTenant.findUnique({ where: { koperasiName } });
    if (!tenant) return null;
    return {
      id: tenant.id,
      koperasiName: tenant.koperasiName,
      koperasiType: tenant.koperasiType,
    };
  },

  async createRegisteredUser(input) {
    const user = await prisma.msUser.create({
      data: {
        username: input.username,
        password: input.password,
        name: input.name,
        email: input.email,
        role: 'member',
        tenantId: input.tenantId,
      },
      include: includeTenant,
    });

    return toAuthUser(user)!;
  },

  async findActiveUserByIdentifier(identifier) {
    return toAuthUser(await prisma.msUser.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
        status: 'active',
      },
      include: includeTenant,
    }));
  },

  async upsertDevice(input) {
    const device = await prisma.msDevice.upsert({
      where: { deviceIdentifier: input.deviceIdentifier },
      update: { userId: input.userId, lastSeenAt: input.now },
      create: {
        userId: input.userId,
        deviceIdentifier: input.deviceIdentifier,
        deviceName: 'Flutter Device',
        lastSeenAt: input.now,
      },
    });

    return { id: device.id };
  },
};
