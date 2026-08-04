import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import type { MembershipRequest } from '../middlewares/membership.js'
import { spaceService } from '../services/space.service.js'
import { AppError } from '../utils/AppError.js'
import { param } from '../utils/params.js'

export const listSpacesByWorkspace = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await spaceService.listByWorkspace(param(req, 'workspaceId'))
  res.json({ success: true, data })
})

export const getSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.getById(req.space)
  res.json({ success: true, data })
})

export const createSpace = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await spaceService.create(req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const updateSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.update(req.space, req.body)
  res.json({ success: true, data })
})

export const listMembers = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.listMembers(req.space)
  res.json({ success: true, data })
})

export const addMember = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.addMember(req.space, req.body)
  res.status(201).json({ success: true, data })
})

export const removeMember = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.removeMember(req.space, param(req, 'memberId'))
  res.json({ success: true, data })
})

export const archiveSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.archive(req.space)
  res.json({ success: true, data })
})

export const permanentDeleteSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  await spaceService.permanentDelete(req.space)
  res.json({ success: true })
})
