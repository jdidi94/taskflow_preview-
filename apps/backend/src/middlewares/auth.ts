import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { AppError } from '../utils/AppError.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'

export type AuthedRequest = Request & {
  user?: JwtPayload
}

export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const authedReq = req as AuthedRequest
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    next(new AppError('Authentication required', 401))
    return
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    next(new AppError('Authentication required', 401))
    return
  }

  try {
    authedReq.user = verifyAccessToken(token)
    next()
  } catch {
    next(new AppError('Invalid or expired token', 401))
  }
}

export const requireAdmin: RequestHandler = (req: Request, _res: Response, next: NextFunction): void => {
  const authedReq = req as AuthedRequest
  if (!authedReq.user || authedReq.user.type !== 'admin') {
    next(new AppError('Admin access required', 403))
    return
  }
  next()
}
