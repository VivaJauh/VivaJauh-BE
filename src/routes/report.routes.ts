import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { portfolioPack, reportSummary } from '../services/report.service';
import { ok } from '../utils/response';

export const reportRouter = Router();

reportRouter.use(auth);

reportRouter.get('/summary', async (req, res, next) => {
  try {
    ok(res, await reportSummary());
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/portfolio', async (req, res, next) => {
  try {
    ok(res, await portfolioPack());
  } catch (error) {
    next(error);
  }
});
