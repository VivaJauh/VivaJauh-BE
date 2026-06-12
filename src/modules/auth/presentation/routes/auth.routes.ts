import { Router } from 'express';
import { auth } from '../../../../shared/presentation/middleware/auth';
import type { AuthControllers } from '../controllers/auth.controller';

export function createAuthRouter(controllers: AuthControllers) {
  const authRouter = Router();

  authRouter.post('/register', controllers.registerController);
  authRouter.post('/login', controllers.loginController);
  authRouter.get('/me', auth, controllers.meController);

  return authRouter;
}
