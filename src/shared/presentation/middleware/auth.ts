import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../../infrastructure/security/jwt';
import { fail } from '../http/response';

export function auth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    return;
  }

  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    fail(res, 'Unauthorized', 401, 'UNAUTHORIZED');
  }
}
