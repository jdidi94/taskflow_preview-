import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRoute<TReq extends Request = Request> = (
  req: TReq,
  res: Response,
  next: NextFunction,
) => Promise<unknown>

export function asyncHandler<TReq extends Request = Request>(fn: AsyncRoute<TReq>): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as TReq, res, next)).catch(next)
  }
}
