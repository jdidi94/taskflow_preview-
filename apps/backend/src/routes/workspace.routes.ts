import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import { requireWorkspaceAdmin, requireWorkspaceMember } from '../middlewares/membership.js'
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteWorkspaceMemberSchema,
  updateMemberRoleSchema,
  updateWorkspaceRulesSchema,
  workspaceIdParamSchema,
  workspaceMemberParamSchema,
  invitationTokenParamSchema,
} from './validator/workspace.schemas.js'
import * as workspaceController from '../controllers/workspace.controller.js'

export const workspaceRouter = Router()

workspaceRouter.use(authenticate)

workspaceRouter.get('/', workspaceController.listWorkspaces)
workspaceRouter.post('/', validateBody(createWorkspaceSchema), workspaceController.createWorkspace)

workspaceRouter.post(
  '/accept-invitation/:token',
  validateParams(invitationTokenParamSchema),
  workspaceController.acceptInvitation,
)

workspaceRouter.get(
  '/:id',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceMember,
  workspaceController.getWorkspace,
)
workspaceRouter.put(
  '/:id',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  validateBody(updateWorkspaceSchema),
  workspaceController.updateWorkspace,
)
workspaceRouter.delete(
  '/:id',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  workspaceController.archiveWorkspace,
)
workspaceRouter.post(
  '/:id/restore',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  workspaceController.restoreWorkspace,
)
workspaceRouter.delete(
  '/:id/permanent',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  workspaceController.permanentDeleteWorkspace,
)

workspaceRouter.get(
  '/:id/members',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceMember,
  workspaceController.listMembers,
)
workspaceRouter.delete(
  '/:id/members/:memberId',
  validateParams(workspaceMemberParamSchema),
  requireWorkspaceAdmin,
  workspaceController.removeMember,
)
workspaceRouter.put(
  '/:id/members/:memberId/role',
  validateParams(workspaceMemberParamSchema),
  requireWorkspaceAdmin,
  validateBody(updateMemberRoleSchema),
  workspaceController.updateMemberRole,
)

workspaceRouter.get(
  '/:id/rules',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceMember,
  workspaceController.getRules,
)
workspaceRouter.put(
  '/:id/rules',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  validateBody(updateWorkspaceRulesSchema),
  workspaceController.updateRules,
)

workspaceRouter.post(
  '/:id/invite',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  validateBody(inviteWorkspaceMemberSchema),
  workspaceController.inviteMember,
)
workspaceRouter.get(
  '/:id/invite-link',
  validateParams(workspaceIdParamSchema),
  requireWorkspaceAdmin,
  workspaceController.getInviteLink,
)
