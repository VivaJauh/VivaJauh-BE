import { prisma } from '../../../../shared/infrastructure/persistence/prisma';
import type { KoperasiSummary, MemberSummary, TenantRecordItem } from '../../application/dto/tenant.dto';
import type { TenantRepository } from '../../domain/repositories/tenant.repository';

type RecordRow = NonNullable<Awaited<ReturnType<typeof prisma.trSyncRecord.findFirst>>>;

function toRecordItem(record: RecordRow, ownerName: string): TenantRecordItem {
  return {
    id: record.id,
    user_id: record.userId,
    device_id: record.deviceId,
    record_type: record.recordType,
    payload_json: record.payloadJson as TenantRecordItem['payload_json'],
    sync_status: record.syncStatus,
    idempotency_key: record.idempotencyKey,
    recorded_at: record.recordedAt,
    uploaded_at: record.uploadedAt,
    error_message: record.errorMessage,
    verification_status: record.verificationStatus,
    owner_name: ownerName,
  };
}

async function aggregateForUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return { recordCounts: new Map<string, number>(), savings: new Map<string, { setor: number; tarik: number }>(), repayments: new Map<string, number>(), lastActivity: new Map<string, Date>() };
  }

  const [recordGroups, savingsRows, repaymentGroups] = await Promise.all([
    prisma.trSyncRecord.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { _all: true },
      _max: { recordedAt: true },
    }),
    prisma.trSavingsTransaction.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, direction: true, amount: true },
    }),
    prisma.trLoanRepayment.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { amount: true },
    }),
  ]);

  const recordCounts = new Map<string, number>();
  const lastActivity = new Map<string, Date>();
  for (const group of recordGroups) {
    recordCounts.set(group.userId, group._count._all);
    if (group._max.recordedAt) lastActivity.set(group.userId, group._max.recordedAt);
  }

  const savings = new Map<string, { setor: number; tarik: number }>();
  for (const row of savingsRows) {
    const entry = savings.get(row.userId) ?? { setor: 0, tarik: 0 };
    if (row.direction === 'tarik') entry.tarik += row.amount;
    else entry.setor += row.amount;
    savings.set(row.userId, entry);
  }

  const repayments = new Map<string, number>();
  for (const group of repaymentGroups) {
    repayments.set(group.userId, group._sum.amount ?? 0);
  }

  return { recordCounts, savings, repayments, lastActivity };
}

export const prismaTenantRepository: TenantRepository = {
  async findMemberSummaries(tenantId: string): Promise<MemberSummary[]> {
    const users = await prisma.msUser.findMany({
      where: { tenantId, status: 'active' },
      orderBy: { name: 'asc' },
    });

    const { recordCounts, savings, repayments, lastActivity } = await aggregateForUsers(
      users.map((user) => user.id),
    );

    return users.map((user) => ({
      user_id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      joined_at: user.createdAt,
      record_count: recordCounts.get(user.id) ?? 0,
      savings_total: savings.get(user.id)?.setor ?? 0,
      withdrawals_total: savings.get(user.id)?.tarik ?? 0,
      repayment_total: repayments.get(user.id) ?? 0,
      last_activity_at: lastActivity.get(user.id) ?? null,
    }));
  },

  async memberBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    const user = await prisma.msUser.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    return user !== null;
  },

  async findRecordsByUser(userId: string): Promise<TenantRecordItem[]> {
    const [user, records] = await Promise.all([
      prisma.msUser.findFirst({ where: { id: userId }, select: { name: true } }),
      prisma.trSyncRecord.findMany({
        where: { userId },
        orderBy: { recordedAt: 'desc' },
        take: 200,
      }),
    ]);

    const ownerName = user?.name ?? 'Tidak dikenal';
    return records.map((record) => toRecordItem(record, ownerName));
  },

  async findKoperasiSummaries(): Promise<KoperasiSummary[]> {
    const tenants = await prisma.msTenant.findMany({
      where: { koperasiType: 'primer' },
      orderBy: { koperasiName: 'asc' },
      include: { members: { where: { status: 'active' }, select: { id: true } } },
    });

    const summaries: KoperasiSummary[] = [];
    for (const tenant of tenants) {
      const userIds = tenant.members.map((member) => member.id);
      const { recordCounts, savings, repayments, lastActivity } = await aggregateForUsers(userIds);

      let recordCount = 0;
      let savingsTotal = 0;
      let repaymentTotal = 0;
      let latest: Date | null = null;
      for (const userId of userIds) {
        recordCount += recordCounts.get(userId) ?? 0;
        savingsTotal += (savings.get(userId)?.setor ?? 0) - (savings.get(userId)?.tarik ?? 0);
        repaymentTotal += repayments.get(userId) ?? 0;
        const activity = lastActivity.get(userId);
        if (activity && (!latest || activity > latest)) latest = activity;
      }

      summaries.push({
        tenant_id: tenant.id,
        koperasi_name: tenant.koperasiName,
        koperasi_type: tenant.koperasiType,
        focus_area: tenant.focusArea,
        member_count: userIds.length,
        record_count: recordCount,
        savings_total: savingsTotal,
        repayment_total: repaymentTotal,
        last_activity_at: latest,
      });
    }

    return summaries;
  },

  async findRecordsByTenant(tenantId: string): Promise<TenantRecordItem[]> {
    const users = await prisma.msUser.findMany({
      where: { tenantId, status: 'active' },
      select: { id: true, name: true },
    });
    const nameById = new Map(users.map((user) => [user.id, user.name]));

    const records = await prisma.trSyncRecord.findMany({
      where: { userId: { in: users.map((user) => user.id) } },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    });

    return records.map((record) =>
      toRecordItem(record, nameById.get(record.userId) ?? 'Tidak dikenal'),
    );
  },
};
