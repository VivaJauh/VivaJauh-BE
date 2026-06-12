import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { FundControllers } from '../controllers/fund.controller';

export function createFundRouter(controllers: FundControllers) {
  const fundRouter = Router();

  fundRouter.use(auth);
  fundRouter.get('/overview', controllers.overviewController);
  fundRouter.post('/payments', controllers.recordPaymentController);

  return fundRouter;
}
