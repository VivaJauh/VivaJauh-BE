import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import type { AuthRepository, AuthUser } from '../../domain/repositories/auth.repository';

function toAuthUser(user: Awaited<ReturnType<typeof prisma.msUser.findFirst>>): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    password: user.password,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export const prismaAuthRepository: AuthRepository = {
  async findExistingUser(username, email) {
    return toAuthUser(await prisma.msUser.findFirst({ where: { OR: [{ username }, { email }] } }));
  },

  async createFieldOfficerUser(input) {
    const user = await prisma.msUser.create({
      data: {
        username: input.username,
        password: input.password,
        name: input.name,
        email: input.email,
        role: 'field_officer',
      },
    });

    return toAuthUser(user)!;
  },

  async findActiveUserByIdentifier(identifier) {
    return toAuthUser(await prisma.msUser.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
        status: 'active',
      },
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
