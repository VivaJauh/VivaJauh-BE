import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { SyncControllers } from '../controllers/sync.controller';

export function createSyncRouter(controllers: SyncControllers) {
  const syncRouter = Router();

  syncRouter.use(auth);
  syncRouter.post('/batch', controllers.syncBatchController);
  syncRouter.get('/status', controllers.syncStatusController);
  syncRouter.get('/items', controllers.syncItemsController);

  return syncRouter;
}
