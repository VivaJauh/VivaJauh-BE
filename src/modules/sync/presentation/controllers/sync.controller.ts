import type { NextFunction, Request, Response } from 'express';
import { ok } from '../../../../shared/presentation/http/response';
import type { IncomingSyncItem } from '../../application/dto/incoming-sync-item';
import type { SyncUseCases } from '../../application/use-cases/sync.use-cases';

export function createSyncControllers(syncUseCases: SyncUseCases) {
  return {
    async syncBatchController(req: Request, res: Response, next: NextFunction) {
      try {
        const items: IncomingSyncItem[] = Array.isArray(req.body?.items) ? req.body.items : [];
        ok(res, { results: await syncUseCases.syncBatch(req.user!, items) });
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
