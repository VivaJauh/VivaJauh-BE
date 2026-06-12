import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import type { JwtUser } from '../types/auth';

export function signToken(user: JwtUser) {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(user, config.jwtSecret, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as JwtUser;
}
