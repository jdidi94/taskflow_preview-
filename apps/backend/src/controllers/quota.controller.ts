import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import { quotaService } from '../services/quota.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'

export const listQuotas = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    userId?: string
    workspaceId?: string
    type?: any
    status?: any
  }
  const quotas = await quotaService.list(q)
  res.json({ success: true, data: { quotas } })
})

export const getQuotaStats = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as { userId?: string; workspaceId?: string }
  const stats = await quotaService.stats(q.userId, q.workspaceId)
  res.json({ success: true, data: { stats } })
})

export const getQuota = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.getById(param(req, 'id'))
  res.json({ success: true, data: { quota } })
})

export const createQuota = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.create(req.body)
  res.status(201).json({ success: true, data: { quota } })
})

export const updateQuota = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.update(param(req, 'id'), req.body)
  res.json({ success: true, data: { quota } })
})

export const overrideQuota = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { reason, expiresAt } = req.body as { reason: string; expiresAt?: string | null }
  const quota = await quotaService.setOverride(param(req, 'id'), req.user!.sub, reason, expiresAt)
  res.json({ success: true, data: { quota } })
})

export const clearQuotaOverride = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.clearOverride(param(req, 'id'))
  res.json({ success: true, data: { quota } })
})

export const resetQuota = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.reset(param(req, 'id'))
  res.json({ success: true, data: { quota } })
})

export const deleteQuota = asyncHandler(async (req: any, res: Response) => {
  await quotaService.remove(param(req, 'id'))
  res.json({ success: true })
})
