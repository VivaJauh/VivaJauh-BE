import type { NextFunction, Request, Response } from 'express';
import { fail, ok } from '../../../../shared/presentation/http/response';
import type { SyncUseCases } from '../../application/use-cases/sync.use-cases';

export function createSyncControllers(syncUseCases: SyncUseCases) {
  return {
    async syncBatchController(req: Request, res: Response, next: NextFunction) {
      try {
        if (!Array.isArray(req.body?.items)) {
          fail(res, 'items must be an array', 400, 'BAD_REQUEST');
          return;
        }
        ok(res, { results: await syncUseCases.syncBatch(req.user!, req.body.items) });
      } catch (error) {
        next(error);
      }
    },

    async syncStatusController(_req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await syncUseCases.syncStatus());
      } catch (error) {
        next(error);
      }
    },

    async syncItemsController(_req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await syncUseCases.syncItems());
      } catch (error) {
        next(error);
      }
    },
  };
}

export type SyncControllers = ReturnType<typeof createSyncControllers>;
