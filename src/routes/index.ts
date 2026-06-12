import { Router } from 'express';
import { authRouter } from './auth.routes';
import { syncRouter } from './sync.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/sync', syncRouter);
