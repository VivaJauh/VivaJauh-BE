import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { syncBatch, syncItems, syncStatus, type IncomingSyncItem } from '../services/sync.service';
import { ok } from '../utils/response';

export const syncRouter = Router();

syncRouter.use(auth);

syncRouter.post('/batch', async (req, res, next) => {
  try {
    const items: IncomingSyncItem[] = Array.isArray(req.body?.items) ? req.body.items : [];
    ok(res, { results: await syncBatch(req.user!, items) });
  } catch (error) {
    next(error);
  }
});

syncRouter.get('/status', async (req, res, next) => {
  try {
    ok(res, await syncStatus());
  } catch (error) {
    next(error);
  }
});

syncRouter.get('/items', async (req, res, next) => {
  try {
    ok(res, await syncItems());
  } catch (error) {
    next(error);
  }
});
