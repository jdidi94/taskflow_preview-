import type { Request } from 'express'

/** Express params can be `string | string[]`; validators normalize to string. */
export function param(req: Request, key: string): string {
  const raw = req.params[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  return value ?? ''
}
