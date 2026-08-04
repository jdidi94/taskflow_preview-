import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type AuthPrincipalType = 'user' | 'admin'

export interface JwtPayload {
  sub: string
  type: AuthPrincipalType
  email?: string
  name?: string
  role?: string
}

export function signAccessToken(
  payload: JwtPayload,
  expiresIn: string = env.JWT_EXPIRES_IN,
): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET)
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload')
  }
  return decoded as JwtPayload
}
