import { Prisma } from '../../../../generated/prisma/client';
import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import type { FundLedgerRecord, FundMember, FundStatus } from '../../application/dto/fund.dto';
import type { FundRepository } from '../../domain/repositories/fund.repository';

type UserWithTenant = NonNullable<Awaited<ReturnType<typeof prisma.msUser.findFirst>>> & {
  tenant: { id: string; koperasiName: string; koperasiType: string } | null;
};

type LedgerWithRelations = NonNullable<Awaited<ReturnType<typeof prisma.trFundLedger.findFirst>>> & {
  tenant: { koperasiName: string; koperasiType: string };
  member: { name: string; email: string };
  recorder: { name: string } | null;
};

const includeTenant = { tenant: true } as const;
const includeLedgerRelations = {
  tenant: { select: { koperasiName: true, koperasiType: true } },
  member: { select: { name: true, email: true } },
  recorder: { select: { name: true } },
} as const;

function toFundMember(user: UserWithTenant): FundMember | null {
  if (!user.tenantId || !user.tenant) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    tenantName: user.tenant.koperasiName,
    tenantType: user.tenant.koperasiType,
    joinedAt: user.createdAt,
  };
}

function toLedger(row: LedgerWithRelations): FundLedgerRecord {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantName: row.tenant.koperasiName,
    tenantType: row.tenant.koperasiType,
    memberId: row.memberId,
    memberName: row.member.name,
    memberEmail: row.member.email,
    fundType: row.fundType,
    periodKey: row.periodKey,
    amountDue: row.amountDue,
    amountPaid: row.amountPaid,
    status: row.status,
    dueDate: row.dueDate,
    paidAt: row.paidAt,
    recordedBy: row.recordedBy,
    recorderName: row.recorder?.name ?? null,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const prismaFundRepository: FundRepository = {
  async findMemberById(userId) {
    const user = await prisma.msUser.findFirst({
      where: { id: userId, status: 'active' },
      include: includeTenant,
    });
    return user ? toFundMember(user) : null;
  },

  async findMembersByTenant(tenantId) {
    const users = await prisma.msUser.findMany({
      where: { tenantId, role: 'member', status: 'active' },
      include: includeTenant,
      orderBy: { name: 'asc' },
    });
    return users.map(toFundMember).filter((user): user is FundMember => user !== null);
  },

  async findMembersAcrossPrimaryTenants() {
    const users = await prisma.msUser.findMany({
      where: {
        role: 'member',
        status: 'active',
        tenant: { koperasiType: 'primer' },
      },
      include: includeTenant,
      orderBy: [{ tenant: { koperasiName: 'asc' } }, { name: 'asc' }],
    });
    return users.map(toFundMember).filter((user): user is FundMember => user !== null);
  },

  async ensureCurrentObligations(input) {
    for (const member of input.members) {
      await prisma.trFundLedger.upsert({
        where: {
          memberId_fundType_periodKey: {
            memberId: member.id,
            fundType: 'principal',
            periodKey: 'principal',
          },
        },
        update: {},
        create: {
          tenantId: member.tenantId,
          memberId: member.id,
          fundType: 'principal',
          periodKey: 'principal',
          amountDue: input.principalAmount,
          amountPaid: 0,
          status: input.initialStatus,
          dueDate: member.joinedAt,
        },
      });

      await prisma.trFundLedger.upsert({
        where: {
          memberId_fundType_periodKey: {
            memberId: member.id,
            fundType: 'monthly_dues',
            periodKey: input.periodKey,
          },
        },
        update: {},
        create: {
          tenantId: member.tenantId,
          memberId: member.id,
          fundType: 'monthly_dues',
          periodKey: input.periodKey,
          amountDue: input.monthlyDuesAmount,
          amountPaid: 0,
          status: input.initialStatus,
          dueDate: input.dueDate,
        },
      });
    }
  },

  async findCurrentLedgers(memberIds, periodKey) {
    if (memberIds.length === 0) return [];
    const rows = await prisma.trFundLedger.findMany({
      where: {
        memberId: { in: memberIds },
        OR: [
          { fundType: 'principal', periodKey: 'principal' },
          { fundType: 'monthly_dues', periodKey },
        ],
      },
      include: includeLedgerRelations,
      orderBy: [
        { tenant: { koperasiName: 'asc' } },
        { member: { name: 'asc' } },
        { fundType: 'asc' },
      ],
    });
    return rows.map(toLedger);
  },

  async findLedgerForPayment(input) {
    const row = await prisma.trFundLedger.findUnique({
      where: {
        memberId_fundType_periodKey: {
          memberId: input.memberId,
          fundType: input.fundType,
          periodKey: input.periodKey,
        },
      },
      include: includeLedgerRelations,
    });
    return row ? toLedger(row) : null;
  },

  async updateLedgerPayment(input) {
    const row = await prisma.trFundLedger.update({
      where: { id: input.id },
      data: {
        amountPaid: input.amountPaid,
        status: input.status,
        paidAt: input.paidAt,
        recordedBy: input.recordedBy,
        note: input.note,
      },
      include: includeLedgerRelations,
    });
    return toLedger(row);
  },

  async createAuditLog(input) {
    await prisma.trAuditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        targetType: 'FundLedger',
        targetId: input.targetId,
        resultStatus: input.resultStatus,
        metadataJson: input.metadataJson as Prisma.InputJsonValue,
      },
    });
  },
};
