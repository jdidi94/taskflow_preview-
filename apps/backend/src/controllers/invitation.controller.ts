import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import { invitationService } from '../services/invitation.service.js'
import { User } from '../models/User.js'
import { param } from '../utils/params.js'

export const createInvitation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.create(req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const listInvitations = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.listCreatedByUser(req.user!.sub)
  res.json({ success: true, data })
})

export const listPendingForUser = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await User.findById(req.user!.sub).select('email')
  const data = await invitationService.listPendingForUser(req.user!.sub, user?.email)
  res.json({ success: true, data })
})

export const getByToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.getByToken(param(req, 'token'))
  res.json({ success: true, data })
})

export const acceptByToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.acceptByToken(req.user!.sub, param(req, 'token'))
  res.json({ success: true, data })
})

export const declineByToken = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.declineByToken(req.user!.sub, param(req, 'token'))
  res.json({ success: true, data })
})

export const getById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.getById(param(req, 'invitationId'), req.user!.sub)
  res.json({ success: true, data })
})

export const acceptById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.acceptById(req.user!.sub, param(req, 'invitationId'))
  res.json({ success: true, data })
})

export const declineById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.declineById(req.user!.sub, param(req, 'invitationId'))
  res.json({ success: true, data })
})

export const cancelById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.cancelById(req.user!.sub, param(req, 'invitationId'))
  res.json({ success: true, data })
})

export const bulkInvite = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.bulkInvite(req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const getStats = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await invitationService.getStats(
    param(req, 'entityType') as 'Workspace' | 'Space' | 'Board',
    param(req, 'entityId'),
    req.user!.sub,
  )
  res.json({ success: true, data })
})
