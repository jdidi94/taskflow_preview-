import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { MembershipRequest } from '../middlewares/membership.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import { workspaceService } from '../services/workspace.service.js'
import { emitWorkspaceFromRequest } from '../sockets/emitHelpers.js'
import { AppError } from '../utils/AppError.js'
import { param } from '../utils/params.js'

export const listWorkspaces = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await workspaceService.listForUser(req.user!.sub)
  res.json({ success: true, data })
})

export const createWorkspace = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await workspaceService.create(req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const getWorkspace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const data = await workspaceService.getById(req.workspace)
  res.json({ success: true, data })
})

export const updateWorkspace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  const data = await workspaceService.update(req.workspace, req.body)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:updated', {
    workspace: data,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const archiveWorkspace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  const data = await workspaceService.archive(req.workspace)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:updated', {
    workspace: data,
    archived: true,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const restoreWorkspace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  const data = await workspaceService.restore(req.workspace)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:updated', {
    workspace: data,
    archived: false,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const permanentDeleteWorkspace = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  await workspaceService.permanentDelete(req.workspace)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:deleted', {
    workspaceId,
    deletedBy: req.user!.sub,
  })
  res.json({ success: true })
})

export const listMembers = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const data = await workspaceService.listMembers(req.workspace)
  res.json({ success: true, data })
})

export const removeMember = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  const memberId = param(req, 'memberId')
  const data = await workspaceService.removeMember(req.workspace, memberId)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:member_removed', {
    workspaceId,
    memberId,
    removedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const updateMemberRole = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  const memberId = param(req, 'memberId')
  const data = await workspaceService.updateMemberRole(
    req.workspace,
    memberId,
    req.body.role,
    req.user!.sub,
  )
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:member_role_changed', {
    workspaceId,
    memberId,
    role: req.body.role,
    updatedBy: req.user!.sub,
  })
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:member-updated', {
    workspaceId,
    memberId,
    updates: { role: req.body.role },
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const inviteMember = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const data = await workspaceService.inviteMember(req.workspace, req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const getInviteLink = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const data = await workspaceService.getInviteLink(req.workspace, req.user!.sub)
  res.json({ success: true, data })
})

export const acceptInvitation = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await workspaceService.acceptInvitationToken(req.user!.sub, param(req, 'token'))
  emitWorkspaceFromRequest(req, data.id, 'workspace:member_added', {
    workspaceId: data.id,
    memberId: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const getRules = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const data = await workspaceService.getRules(req.workspace)
  res.json({ success: true, data })
})

export const updateRules = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.workspace) throw new AppError('Workspace not found', 404)
  const workspaceId = req.workspace._id.toString()
  const data = await workspaceService.updateRules(req.workspace, req.user!.sub, req.body.content)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:settings-updated', {
    workspaceId,
    rules: data,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})
