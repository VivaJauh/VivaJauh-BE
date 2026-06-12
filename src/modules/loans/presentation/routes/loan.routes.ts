import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { LoanControllers } from '../controllers/loan.controller';

export function createLoanRouter(controllers: LoanControllers) {
  const loanRouter = Router();

  loanRouter.use(auth);
  loanRouter.post('/', controllers.createApplicationController);
  loanRouter.get('/', controllers.listApplicationsController);
  loanRouter.post('/:id/recommendation', controllers.generateRecommendationController);
  loanRouter.patch('/:id/approve', controllers.approveApplicationController);
  loanRouter.patch('/:id/reject', controllers.rejectApplicationController);
  loanRouter.get('/:id', controllers.getApplicationController);

  return loanRouter;
}
