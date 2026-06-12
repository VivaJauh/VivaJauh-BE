import jwt, { type SignOptions } from 'jsonwebtoken';
import type { JwtUser } from '../../domain/auth';
import { config } from '../config/env';

export function signToken(user: JwtUser) {
  const options: SignOptions = { expiresIn: '7d' };
  return jwt.sign(user, config.jwtSecret, options);
}

export function verifyToken(token: string) {
  return jwt.verify(token, config.jwtSecret) as JwtUser;
}
