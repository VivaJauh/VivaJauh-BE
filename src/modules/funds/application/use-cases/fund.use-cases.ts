import type { JwtUser } from '../../../../shared/domain/auth';
import type { FundRepository } from '../../domain/repositories/fund.repository';
import type {
  FundLedgerRecord,
  FundMember,
  FundOverview,
  FundOverviewItem,
  FundOverviewTotals,
  FundScope,
  FundStatus,
  FundType,
  RecordFundPaymentInput,
} from '../dto/fund.dto';

const PRINCIPAL_AMOUNT = 100000;
const MONTHLY_DUES_AMOUNT = 25000;

function currentPeriod(now = new Date()) {
  const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
  return `${now.getUTCFullYear()}-${month}`;
}

function dueDateForPeriod(periodKey: string) {
  const [year, month] = periodKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

function statusFor(row: Pick<FundLedgerRecord, 'amountDue' | 'amountPaid' | 'dueDate'>, now = new Date()): FundStatus {
  if (row.amountPaid >= row.amountDue) return 'paid';
  if (row.amountPaid > 0) return 'partial';
  return now > row.dueDate ? 'overdue' : 'unpaid';
}

function labelFor(row: Pick<FundLedgerRecord, 'fundType' | 'periodKey'>) {
  return row.fundType === 'principal' ? 'Dana Pokok' : `Dana Iuran ${row.periodKey}`;
}

function toItem(row: FundLedgerRecord, now = new Date()): FundOverviewItem {
  const status = statusFor(row, now);
  return {
    id: row.id,
    tenant_id: row.tenantId,
    tenant_name: row.tenantName,
    tenant_type: row.tenantType,
    member_id: row.memberId,
    member_name: row.memberName,
    member_email: row.memberEmail,
    fund_type: row.fundType,
    label: labelFor(row),
    period_key: row.periodKey,
    amount_due: row.amountDue,
    amount_paid: row.amountPaid,
    outstanding_amount: Math.max(row.amountDue - row.amountPaid, 0),
    status,
    due_date: row.dueDate.toISOString(),
    paid_at: row.paidAt?.toISOString() ?? null,
    recorded_by: row.recordedBy,
    recorder_name: row.recorderName,
    note: row.note,
  };
}

function computeTotals(items: FundOverviewItem[], memberCount: number): FundOverviewTotals {
  return {
    member_count: memberCount,
    obligation_count: items.length,
    principal_due_total: items
      .filter((item) => item.fund_type === 'principal')
      .reduce((sum, item) => sum + item.amount_due, 0),
    monthly_due_total: items
      .filter((item) => item.fund_type === 'monthly_dues')
      .reduce((sum, item) => sum + item.amount_due, 0),
    paid_total: items.reduce((sum, item) => sum + item.amount_paid, 0),
    outstanding_total: items.reduce((sum, item) => sum + item.outstanding_amount, 0),
    overdue_total: items
      .filter((item) => item.status === 'overdue')
      .reduce((sum, item) => sum + item.outstanding_amount, 0),
  };
}

function validateFundType(value: unknown): FundType {
  if (value === 'principal' || value === 'monthly_dues') return value;
  throw new Error('INVALID_INPUT: fund_type must be principal or monthly_dues');
}

function validatePeriodKey(value: unknown, fundType: FundType) {
  if (fundType === 'principal') return 'principal';
  if (typeof value !== 'string' || value.trim() === '') return currentPeriod();
  const periodKey = value.trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodKey)) {
    throw new Error('INVALID_INPUT: period_key must use YYYY-MM format with month 01-12');
  }
  return periodKey;
}

function parsePositiveNumber(value: unknown) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function membersForScope(repository: FundRepository, user: JwtUser): Promise<{ scope: FundScope; members: FundMember[] }> {
  if (user.role === 'member') {
    const member = await repository.findMemberById(user.sub);
    return { scope: 'member', members: member ? [member] : [] };
  }

  if (user.role === 'primary_admin') {
    if (!user.tenant_id) throw new Error('FORBIDDEN_SCOPE: user has no tenant');
    return { scope: 'primary', members: await repository.findMembersByTenant(user.tenant_id) };
  }

  if (user.role === 'secondary_admin') {
    return { scope: 'secondary', members: await repository.findMembersAcrossPrimaryTenants() };
  }

  throw new Error('FORBIDDEN_SCOPE: unsupported role');
}

async function ensureCurrent(repository: FundRepository, members: FundMember[], periodKey: string, dueDate: Date) {
  await repository.ensureCurrentObligations({
    members,
    periodKey,
    dueDate,
    principalAmount: PRINCIPAL_AMOUNT,
    monthlyDuesAmount: MONTHLY_DUES_AMOUNT,
    initialStatus: 'unpaid',
  });
}

export function createFundUseCases(repository: FundRepository) {
  return {
    async overview(user: JwtUser): Promise<FundOverview> {
      const now = new Date();
      const periodKey = currentPeriod(now);
      const dueDate = dueDateForPeriod(periodKey);
      const { scope, members } = await membersForScope(repository, user);

      await ensureCurrent(repository, members, periodKey, dueDate);
      const ledgers = await repository.findCurrentLedgers(members.map((member) => member.id), periodKey);
      const items = ledgers.map((ledger) => toItem(ledger, now));

      return {
        generated_at: now.toISOString(),
        scope,
        current_period: periodKey,
        iuran_due_date: dueDate.toISOString(),
        principal_amount: PRINCIPAL_AMOUNT,
        monthly_dues_amount: MONTHLY_DUES_AMOUNT,
        totals: computeTotals(items, members.length),
        items,
      };
    },

    async recordPayment(input: RecordFundPaymentInput): Promise<FundOverviewItem> {
      if (input.actorRole !== 'primary_admin') {
        throw new Error('FORBIDDEN_SCOPE: only primary admin can record fund payments');
      }

      const memberId = typeof input.memberId === 'string' ? input.memberId.trim() : '';
      if (!memberId) throw new Error('INVALID_INPUT: member_id is required');

      const fundType = validateFundType(input.fundType);
      const periodKey = validatePeriodKey(input.periodKey, fundType);
      const amount = parsePositiveNumber(input.amount);
      if (amount === null) throw new Error('INVALID_INPUT: amount must be a finite positive number');

      const member = await repository.findMemberById(memberId);
      if (!member || member.role !== 'member') {
        throw new Error('INVALID_INPUT: member not found');
      }
      if (member.tenantId !== input.actorTenantId) {
        throw new Error('FORBIDDEN_SCOPE: member is not part of your cooperative');
      }

      const obligationPeriodKey = fundType === 'principal' ? currentPeriod() : periodKey;
      await ensureCurrent(repository, [member], obligationPeriodKey, dueDateForPeriod(obligationPeriodKey));

      const ledger = await repository.findLedgerForPayment({ memberId, fundType, periodKey });
      if (!ledger) throw new Error('INVALID_INPUT: obligation not found');

      const outstanding = Math.max(ledger.amountDue - ledger.amountPaid, 0);
      if (amount > outstanding) {
        throw new Error(`INVALID_INPUT: amount exceeds outstanding balance (${outstanding})`);
      }

      const now = new Date();
      const amountPaid = ledger.amountPaid + amount;
      const updated = await repository.updateLedgerPayment({
        id: ledger.id,
        amountPaid,
        status: statusFor({ ...ledger, amountPaid }, now),
        paidAt: now,
        recordedBy: input.actorUserId,
        note: typeof input.note === 'string' ? input.note.trim() || null : null,
      });

      const item = toItem(updated, now);
      await repository.createAuditLog({
        userId: input.actorUserId,
        action: 'fund_payment_recorded',
        targetId: updated.id,
        resultStatus: item.status,
        metadataJson: {
          member_id: member.id,
          member_name: member.name,
          tenant_id: member.tenantId,
          tenant_name: member.tenantName,
          fund_type: fundType,
          period_key: periodKey,
          amount_paid: amount,
          new_total_paid: amountPaid,
          outstanding_amount: item.outstanding_amount,
        },
      });

      return item;
    },
  };
}

export type FundUseCases = ReturnType<typeof createFundUseCases>;
