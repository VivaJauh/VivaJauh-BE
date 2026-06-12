import type { NextFunction, Request, Response } from 'express';
import type { VerificationStatus } from '../../../../shared/domain/sync-record';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { VerificationUseCases } from '../../application/use-cases/verification.use-cases';

export function createVerificationControllers(verificationUseCases: VerificationUseCases) {
  return {
    async verificationQueueController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'remote_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }
        ok(res, await verificationUseCases.verificationQueue());
      } catch (error) {
        next(error);
      }
    },

    async verifyRecordController(req: Request, res: Response, next: NextFunction) {
      try {
        if (req.user?.role !== 'remote_admin') {
          fail(res, 'Forbidden', 403, 'FORBIDDEN');
          return;
        }

        const verificationStatus = (req.body?.verification_status ?? 'verified') as VerificationStatus;
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const record = await verificationUseCases.verifyRecord(id, verificationStatus, req.user?.sub);
        if (!record) {
          fail(res, 'Record not found', 404, 'NOT_FOUND');
          return;
        }

        ok(res, record);
      } catch (error) {
        next(error);
      }
    },
  };
}

export type VerificationControllers = ReturnType<typeof createVerificationControllers>;
