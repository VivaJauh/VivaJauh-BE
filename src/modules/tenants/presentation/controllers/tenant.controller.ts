import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { TenantUseCases } from '../../application/use-cases/tenant.use-cases';

export function createTenantControllers(tenantUseCases: TenantUseCases) {
  return {
    async listMembersController(req: Request, res: Response, next: NextFunction) {
      try {
        const tenantId = req.user?.tenant_id;
        if (req.user?.role !== 'primary_admin' || !tenantId) {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        ok(res, await tenantUseCases.listMembers(tenantId));
      } catch (error) {
        next(error);
      }
    },

    async memberRecordsController(req: Request, res: Response, next: NextFunction) {
      try {
        const tenantId = req.user?.tenant_id;
        if (req.user?.role !== 'primary_admin' || !tenantId) {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
        ok(res, await tenantUseCases.getMemberRecords(tenantId, userId));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('FORBIDDEN_SCOPE:')) {
          fail(res, error.message.replace('FORBIDDEN_SCOPE: ', ''), 403, 'FORBIDDEN');
          return;
        }
        next(error);
      }
    },

    async koperasiSummariesController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'secondary_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        ok(res, await tenantUseCases.listKoperasiSummaries());
      } catch (error) {
        next(error);
      }
    },

    async tenantRecordsController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'secondary_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        const tenantId = Array.isArray(req.params.tenantId)
          ? req.params.tenantId[0]
          : req.params.tenantId;
        ok(res, await tenantUseCases.getTenantRecords(tenantId));
      } catch (error) {
        next(error);
      }
    },
  };
}

export type TenantControllers = ReturnType<typeof createTenantControllers>;
