import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import type { AiProvider } from '../models/Integration.js'
import { aiTokenService } from '../services/aiToken.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'

export const getAiTokens = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    provider?: AiProvider
    status?: 'active' | 'inactive' | 'archived' | 'invalid'
    includeArchived?: boolean
  }

  const tokens = await aiTokenService.list(q)
  res.json({ success: true, data: { tokens } })
})

export const getActiveToken = asyncHandler(async (req: any, res: Response) => {
  const token = await aiTokenService.getActiveToken(param(req, 'provider') as AiProvider)
  res.json({ success: true, data: { token } })
})

export const createAiToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const token = await aiTokenService.create(req.body, req.user!.sub)
  res.status(201).json({ success: true, data: { token } })
})

export const updateAiToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const token = await aiTokenService.update(param(req, 'tokenId'), req.body, req.user!.sub)
  res.json({ success: true, data: { token } })
})

export const activateToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const token = await aiTokenService.activate(param(req, 'tokenId'), req.user!.sub)
  res.json({ success: true, data: { token } })
})

export const archiveToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const token = await aiTokenService.archive(param(req, 'tokenId'), req.user!.sub)
  res.json({ success: true, data: { token } })
})

export const deleteToken = asyncHandler(async (req: any, res: Response) => {
  await aiTokenService.remove(param(req, 'tokenId'))
  res.json({ success: true })
})

export const testToken = asyncHandler(async (req: any, res: Response) => {
  const result = await aiTokenService.test(param(req, 'tokenId'))
  res.json({ success: true, data: result })
})

export const getTokenStats = asyncHandler(async (_req: any, res: Response) => {
  const stats = await aiTokenService.stats()
  res.json({ success: true, data: { stats } })
})

