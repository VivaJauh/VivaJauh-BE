import { Router } from 'express';
import { authRouter } from './auth.routes';
import { reportRouter } from './report.routes';
import { syncRouter } from './sync.routes';
import { verificationRouter } from './verification.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/sync', syncRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/verification', verificationRouter);
