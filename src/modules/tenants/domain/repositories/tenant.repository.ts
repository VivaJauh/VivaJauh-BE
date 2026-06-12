import type { KoperasiSummary, MemberSummary, TenantRecordItem } from '../../application/dto/tenant.dto';

export type TenantRepository = {
  findMemberSummaries(tenantId: string): Promise<MemberSummary[]>;
  memberBelongsToTenant(userId: string, tenantId: string): Promise<boolean>;
  findRecordsByUser(userId: string): Promise<TenantRecordItem[]>;
  findKoperasiSummaries(): Promise<KoperasiSummary[]>;
  findRecordsByTenant(tenantId: string): Promise<TenantRecordItem[]>;
};
