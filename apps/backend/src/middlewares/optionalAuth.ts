import type { NextFunction, RequestHandler } from 'express'

import type { AuthedRequest } from './auth.js'
import { verifyAccessToken } from '../utils/jwt.js'

/**
 * Optional auth for public endpoints.
 * - If `Authorization` is missing/empty/invalid: continue without `req.user`.
 * - If valid: populate `req.user`.
 */
export const optionalAuthenticate: RequestHandler = (req, _res, next: NextFunction) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    next()
    return
  }

  try {
    const authedReq = req as AuthedRequest
    authedReq.user = verifyAccessToken(token)
  } catch {
    // Keep public access: invalid/expired tokens don't block public endpoints.
  }

  next()
}

