import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import type { MembershipRequest } from '../middlewares/membership.js'
import { analyticsService } from '../services/analytics.service.js'
import { AppError } from '../utils/AppError.js'

export const getUserAnalytics = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const userId = req.user!.sub
  const q = (req as any).validatedQuery ?? req.query
  const data = await analyticsService.getUserAnalytics(userId, {
    range: (q as any).range as any,
  })
  res.json({ success: true, data })
})

export const getWorkspaceAnalytics = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const q = (req as any).validatedQuery ?? req.query

  const data = await analyticsService.getWorkspaceAnalytics(
    req.workspace._id.toString(),
    req.user!.sub,
    {
      period: (q as any).period as any,
      startDate: (q as any).startDate as any,
      endDate: (q as any).endDate as any,
    },
  )

  res.json({ success: true, data: { ...data, count: 1 } })
})

export const getSpaceAnalytics = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const q = (req as any).validatedQuery ?? req.query

  const data = await analyticsService.getSpaceAnalytics(req.space._id.toString(), req.user!.sub, {
    period: (q as any).period as any,
    startDate: (q as any).startDate as any,
    endDate: (q as any).endDate as any,
  })

  res.json({ success: true, data: { ...data, count: 1 } })
})

export const getTeamPerformance = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const q = (req as any).validatedQuery ?? req.query

  const data = await analyticsService.getTeamPerformance(req.space._id.toString(), req.user!.sub, {
    period: (q as any).period as any,
    startDate: (q as any).startDate as any,
    endDate: (q as any).endDate as any,
  })

  res.json({ success: true, data })
})

export const generateSpaceAnalytics = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)

  const data = await analyticsService.generateSpaceAnalytics(req.space._id.toString(), req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const exportSpaceAnalytics = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const q = (req as any).validatedQuery ?? req.query

  const format = (q as any).format as 'json' | 'csv' | undefined
  const data = await analyticsService.exportSpaceAnalytics(req.space._id.toString(), req.user!.sub, {
    format: format ?? 'json',
    period: (q as any).period as any,
    startDate: (q as any).startDate as any,
    endDate: (q as any).endDate as any,
  })

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=space-analytics-${req.space._id}.csv`)
    res.status(200).send((data as any).csv ?? '')
    return
  }

  res.json({ success: true, data: { analytics: (data as any).analytics, period: (data as any).period } })
})

