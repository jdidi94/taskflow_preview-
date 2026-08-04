import type { Response } from 'express'

import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'
import { integrationService } from '../services/integration.service.js'

export const getIntegrations = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    category?: string
    status?: string
    search?: string
  }
  const integrations = await integrationService.list(q)
  res.json({ success: true, data: { integrations } })
})

export const getIntegrationStats = asyncHandler(async (_req: any, res: Response) => {
  const stats = await integrationService.stats()
  res.json({ success: true, data: { stats } })
})

export const getIntegration = asyncHandler(async (req: any, res: Response) => {
  const integration = await integrationService.getById(param(req, 'id'))
  res.json({ success: true, data: { integration } })
})

export const createIntegration = asyncHandler(async (req: any, res: Response) => {
  const integration = await integrationService.create(req.body)
  res.status(201).json({ success: true, data: { integration } })
})

export const updateIntegration = asyncHandler(async (req: any, res: Response) => {
  const integration = await integrationService.update(param(req, 'id'), req.body)
  res.json({ success: true, data: { integration } })
})

export const deleteIntegration = asyncHandler(async (req: any, res: Response) => {
  await integrationService.remove(param(req, 'id'))
  res.json({ success: true })
})

export const testIntegration = asyncHandler(async (req: any, res: Response) => {
  const result = await integrationService.test(param(req, 'id'))
  res.json({ success: true, data: result })
})

export const syncIntegration = asyncHandler(async (req: any, res: Response) => {
  const integration = await integrationService.sync(param(req, 'id'))
  res.json({ success: true, data: { integration } })
})

export const getIntegrationHealth = asyncHandler(async (req: any, res: Response) => {
  const health = await integrationService.health(param(req, 'id'))
  res.json({ success: true, data: { health } })
})

export const toggleIntegration = asyncHandler(async (req: any, res: Response) => {
  const integration = await integrationService.toggle(param(req, 'id'))
  res.json({ success: true, data: { integration } })
})

