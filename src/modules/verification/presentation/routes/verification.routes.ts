import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { VerificationControllers } from '../controllers/verification.controller';

export function createVerificationRouter(controllers: VerificationControllers) {
  const verificationRouter = Router();

  verificationRouter.use(auth);
  verificationRouter.get('/queue', controllers.verificationQueueController);
  verificationRouter.patch('/records/:id', controllers.verifyRecordController);

  return verificationRouter;
}
