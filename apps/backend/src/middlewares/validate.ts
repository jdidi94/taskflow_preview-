import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'

/**
 * Validate JSON request bodies using a Zod schema.
 * - Parses `req.body`
 * - Replaces `req.body` with the parsed output
 * - Throws `AppError(400)` on validation failure (ZodError is also handled by `errorHandler`)
 */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      // Let the central error handler format Zod errors; keep status consistent.
      next(parsed.error)
      return
    }
    req.body = parsed.data
    next()
  }
}

/**
 * Validate `req.params` using a Zod schema.
 * - Parses `req.params`
 * - Replaces `req.params` with the parsed output
 */
export function validateParams(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.safeParse(req.params)
    if (!parsed.success) {
      next(parsed.error)
      return
    }

    req.params = parsed.data as any
    next()
  }
}

/**
 * Validate `req.query` using a Zod schema.
 * - Express can represent query values as `string | string[] | undefined`
 * - This middleware normalizes arrays to their first item before parsing
 */
export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const normalized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(req.query)) {
      normalized[key] = Array.isArray(value) ? value[0] : value
    }

    const parsed = schema.safeParse(normalized)
    if (!parsed.success) {
      next(parsed.error)
      return
    }

    // Express5 exposes `req.query` as a getter-only property in some configs,
    // so don't assign to it. Store validated query for downstream handlers.
    ;(req as any).validatedQuery = parsed.data
    next()
  }
}

