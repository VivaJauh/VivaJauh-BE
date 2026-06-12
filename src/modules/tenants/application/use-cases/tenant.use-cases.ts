import type { TenantRepository } from '../../domain/repositories/tenant.repository';

export function createTenantUseCases(repository: TenantRepository) {
  return {
    async listMembers(tenantId: string) {
      return repository.findMemberSummaries(tenantId);
    },

    async getMemberRecords(tenantId: string, userId: string) {
      const belongs = await repository.memberBelongsToTenant(userId, tenantId);
      if (!belongs) {
        throw new Error('FORBIDDEN_SCOPE: member is not part of your cooperative');
      }
      return repository.findRecordsByUser(userId);
    },

    async listKoperasiSummaries() {
      return repository.findKoperasiSummaries();
    },

    async getTenantRecords(tenantId: string) {
      return repository.findRecordsByTenant(tenantId);
    },
  };
}

export type TenantUseCases = ReturnType<typeof createTenantUseCases>;
