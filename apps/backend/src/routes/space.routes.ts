import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import {
  requireSpaceAdmin,
  requireSpaceMember,
  requireWorkspaceMember,
} from '../middlewares/membership.js'
import {
  createSpaceSchema,
  updateSpaceSchema,
  addSpaceMemberSchema,
  spaceIdParamSchema,
  spaceWorkspaceParamSchema,
  spaceMemberParamSchema,
} from './validator/space.schemas.js'
import * as spaceController from '../controllers/space.controller.js'

export const spaceRouter = Router()

spaceRouter.use(authenticate)

spaceRouter.get(
  '/workspace/:workspaceId',
  validateParams(spaceWorkspaceParamSchema),
  requireWorkspaceMember,
  spaceController.listSpacesByWorkspace,
)

spaceRouter.post('/', validateBody(createSpaceSchema), spaceController.createSpace)

spaceRouter.get(
  '/:id',
  validateParams(spaceIdParamSchema),
  requireSpaceMember,
  spaceController.getSpace,
)
spaceRouter.put(
  '/:id',
  validateParams(spaceIdParamSchema),
  requireSpaceAdmin,
  validateBody(updateSpaceSchema),
  spaceController.updateSpace,
)

spaceRouter.get(
  '/:id/members',
  validateParams(spaceIdParamSchema),
  requireSpaceMember,
  spaceController.listMembers,
)
spaceRouter.post(
  '/:id/members',
  validateParams(spaceIdParamSchema),
  requireSpaceAdmin,
  validateBody(addSpaceMemberSchema),
  spaceController.addMember,
)
spaceRouter.delete(
  '/:id/members/:memberId',
  validateParams(spaceMemberParamSchema),
  requireSpaceAdmin,
  spaceController.removeMember,
)

spaceRouter.post(
  '/:id/archive',
  validateParams(spaceIdParamSchema),
  requireSpaceAdmin,
  spaceController.archiveSpace,
)
spaceRouter.post(
  '/:id/restore',
  validateParams(spaceIdParamSchema),
  requireSpaceAdmin,
  spaceController.restoreSpace,
)
spaceRouter.delete(
  '/:id/permanent',
  validateParams(spaceIdParamSchema),
  requireSpaceAdmin,
  spaceController.permanentDeleteSpace,
)
