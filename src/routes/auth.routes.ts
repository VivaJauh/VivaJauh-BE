import { Router } from 'express';
import { auth } from '../middlewares/auth';
import { login, register } from '../services/auth.service';
import { ok } from '../utils/response';

export const authRouter = Router();

authRouter.post('/register', async (req, res, next) => {
  try {
    ok(res, await register({
      name: req.body?.name,
      email: req.body?.email,
      password: req.body?.password,
      deviceId: req.body?.device_id ?? req.body?.deviceId,
    }), 201);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    ok(res, await login(req.body?.identifier ?? '', req.body?.password ?? '', req.body?.device_id ?? req.body?.deviceId));
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', auth, (req, res) => {
  ok(res, req.user);
});
