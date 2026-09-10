import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import { recordAdminAudit } from '../services/adminAudit.service.js'
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
  void recordAdminAudit(req, {
    action: 'quota.create',
    targetType: 'quota',
    targetId: String((quota as any)._id ?? (quota as any).id ?? ''),
    targetLabel: String((quota as any).userId ?? ''),
    summary: `Created quota for user ${(quota as any).userId ?? ''}`,
    href: '/ai',
  })
  res.status(201).json({ success: true, data: { quota } })
})

export const updateQuota = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.update(param(req, 'id'), req.body)
  res.json({ success: true, data: { quota } })
})

export const overrideQuota = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { reason, expiresAt } = req.body as { reason: string; expiresAt?: string | null }
  const quota = await quotaService.setOverride(param(req, 'id'), req.user!.sub, reason, expiresAt)
  void recordAdminAudit(req, {
    action: 'quota.override',
    targetType: 'quota',
    targetId: param(req, 'id'),
    summary: `Overrode quota ${param(req, 'id')}`,
    metadata: { reason },
    notify: true,
    notifyPriority: 'high',
    href: '/ai',
  })
  res.json({ success: true, data: { quota } })
})

export const clearQuotaOverride = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.clearOverride(param(req, 'id'))
  res.json({ success: true, data: { quota } })
})

export const resetQuota = asyncHandler(async (req: any, res: Response) => {
  const quota = await quotaService.reset(param(req, 'id'))
  void recordAdminAudit(req, {
    action: 'quota.reset',
    targetType: 'quota',
    targetId: param(req, 'id'),
    summary: `Reset quota ${param(req, 'id')}`,
    href: '/ai',
  })
  res.json({ success: true, data: { quota } })
})

export const deleteQuota = asyncHandler(async (req: any, res: Response) => {
  const id = param(req, 'id')
  await quotaService.remove(id)
  void recordAdminAudit(req, {
    action: 'quota.delete',
    targetType: 'quota',
    targetId: id,
    summary: `Deleted quota ${id}`,
    notify: true,
    href: '/ai',
  })
  res.json({ success: true })
})
