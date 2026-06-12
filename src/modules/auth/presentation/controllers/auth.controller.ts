import type { NextFunction, Request, Response } from 'express';
import { ok } from '../../../../shared/presentation/http/response';
import type { AuthUseCases } from '../../application/use-cases/auth.use-cases';

export function createAuthControllers(authUseCases: AuthUseCases) {
  return {
    async registerController(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await authUseCases.register({
          name: req.body?.name,
          email: req.body?.email,
          password: req.body?.password,
          deviceId: req.body?.device_id ?? req.body?.deviceId,
        }), 201);
      } catch (error) {
        next(error);
      }
    },

    async loginController(req: Request, res: Response, next: NextFunction) {
      try {
        ok(res, await authUseCases.login(req.body?.identifier ?? '', req.body?.password ?? '', req.body?.device_id ?? req.body?.deviceId));
      } catch (error) {
        next(error);
      }
    },

    meController(req: Request, res: Response) {
      ok(res, req.user);
    },
  };
}

export type AuthControllers = ReturnType<typeof createAuthControllers>;
