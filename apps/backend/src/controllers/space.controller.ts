import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import type { MembershipRequest } from '../middlewares/membership.js'
import { spaceService } from '../services/space.service.js'
import { emitWorkspaceFromRequest } from '../sockets/emitHelpers.js'
import { AppError } from '../utils/AppError.js'
import { param } from '../utils/params.js'

function spaceWorkspaceId(space: { workspace?: unknown }) {
  return String(space.workspace)
}

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
  emitWorkspaceFromRequest(req, String(data.workspace), 'workspace:space_created', {
    space: data,
    workspaceId: String(data.workspace),
    createdBy: req.user!.sub,
  })
  res.status(201).json({ success: true, data })
})

export const updateSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const workspaceId = spaceWorkspaceId(req.space)
  const data = await spaceService.update(req.space, req.body)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:space_updated', {
    space: data,
    workspaceId,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const listMembers = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const data = await spaceService.listMembers(req.space)
  res.json({ success: true, data })
})

export const addMember = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const workspaceId = spaceWorkspaceId(req.space)
  const data = await spaceService.addMember(req.space, req.body)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:space_updated', {
    space: data,
    workspaceId,
    memberAdded: req.body.userId,
    updatedBy: req.user!.sub,
  })
  res.status(201).json({ success: true, data })
})

export const removeMember = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const workspaceId = spaceWorkspaceId(req.space)
  const memberId = param(req, 'memberId')
  const data = await spaceService.removeMember(req.space, memberId)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:space_updated', {
    space: data,
    workspaceId,
    memberRemoved: memberId,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const archiveSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const workspaceId = spaceWorkspaceId(req.space)
  const data = await spaceService.archive(req.space)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:space_updated', {
    space: data,
    workspaceId,
    archived: true,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const restoreSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const workspaceId = spaceWorkspaceId(req.space)
  const data = await spaceService.restore(req.space)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:space_updated', {
    space: data,
    workspaceId,
    archived: false,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const permanentDeleteSpace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.space) throw new AppError('Space not found', 404)
  const workspaceId = spaceWorkspaceId(req.space)
  const spaceId = req.space._id.toString()
  await spaceService.permanentDelete(req.space)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:space_deleted', {
    spaceId,
    workspaceId,
    deletedBy: req.user!.sub,
  })
  res.json({ success: true })
})
