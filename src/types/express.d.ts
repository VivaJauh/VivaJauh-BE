import type { JwtUser } from '../shared/domain/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export {};
