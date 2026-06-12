import type { InputJsonValue } from '../../../../shared/domain/json';
import type { FundLedgerRecord, FundMember, FundStatus, FundType } from '../../application/dto/fund.dto';

export type FundRepository = {
  findMemberById(userId: string): Promise<FundMember | null>;
  findMembersByTenant(tenantId: string): Promise<FundMember[]>;
  findMembersAcrossPrimaryTenants(): Promise<FundMember[]>;
  ensureCurrentObligations(input: {
    members: FundMember[];
    periodKey: string;
    dueDate: Date;
    principalAmount: number;
    monthlyDuesAmount: number;
    initialStatus: FundStatus;
  }): Promise<void>;
  findCurrentLedgers(memberIds: string[], periodKey: string): Promise<FundLedgerRecord[]>;
  findLedgerForPayment(input: { memberId: string; fundType: FundType; periodKey: string }): Promise<FundLedgerRecord | null>;
  updateLedgerPayment(input: {
    id: string;
    amountPaid: number;
    status: FundStatus;
    paidAt: Date;
    recordedBy: string;
    note: string | null;
  }): Promise<FundLedgerRecord>;
  createAuditLog(input: {
    userId: string;
    action: string;
    targetId: string;
    resultStatus: string;
    metadataJson: InputJsonValue;
  }): Promise<void>;
};
