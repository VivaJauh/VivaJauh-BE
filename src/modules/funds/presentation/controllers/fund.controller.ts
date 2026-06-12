import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { FundUseCases } from '../../application/use-cases/fund.use-cases';

export function createFundControllers(fundUseCases: FundUseCases) {
  return {
    async overviewController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!req.user) {
          fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
          return;
        }
        ok(res, await fundUseCases.overview(req.user));
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('FORBIDDEN_SCOPE:')) {
          fail(res, error.message.replace('FORBIDDEN_SCOPE: ', ''), 403, 'FORBIDDEN');
          return;
        }
        next(error);
      }
    },

    async recordPaymentController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!req.user) {
          fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
          return;
        }

        ok(res, await fundUseCases.recordPayment({
          actorUserId: req.user.sub,
          actorRole: req.user.role,
          actorTenantId: req.user.tenant_id,
          memberId: req.body?.member_id,
          fundType: req.body?.fund_type,
          periodKey: req.body?.period_key,
          amount: req.body?.amount,
          note: req.body?.note,
        }), 201);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('INVALID_INPUT:')) {
          fail(res, error.message.replace('INVALID_INPUT: ', ''), 400, 'BAD_REQUEST');
          return;
        }
        if (error instanceof Error && error.message.startsWith('FORBIDDEN_SCOPE:')) {
          fail(res, error.message.replace('FORBIDDEN_SCOPE: ', ''), 403, 'FORBIDDEN');
          return;
        }
        next(error);
      }
    },
  };
}

export type FundControllers = ReturnType<typeof createFundControllers>;
