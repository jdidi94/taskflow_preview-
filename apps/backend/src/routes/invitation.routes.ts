import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams } from '../middlewares/validate.js'
import {
  createInvitationSchema,
  bulkInviteSchema,
  invitationIdParamSchema,
  invitationTokenParamSchema,
  invitationStatsParamSchema,
} from './validator/invitation.schemas.js'
import * as invitationController from '../controllers/invitation.controller.js'

export const invitationRouter = Router()

invitationRouter.use(authenticate)

invitationRouter.post('/', validateBody(createInvitationSchema), invitationController.createInvitation)
invitationRouter.get('/', invitationController.listInvitations)
invitationRouter.get('/user/pending', invitationController.listPendingForUser)

invitationRouter.post('/bulk-invite', validateBody(bulkInviteSchema), invitationController.bulkInvite)

invitationRouter.get(
  '/token/:token',
  validateParams(invitationTokenParamSchema),
  invitationController.getByToken,
)
invitationRouter.post(
  '/token/:token/accept',
  validateParams(invitationTokenParamSchema),
  invitationController.acceptByToken,
)
invitationRouter.post(
  '/token/:token/decline',
  validateParams(invitationTokenParamSchema),
  invitationController.declineByToken,
)

invitationRouter.get(
  '/stats/:entityType/:entityId',
  validateParams(invitationStatsParamSchema),
  invitationController.getStats,
)

invitationRouter.get(
  '/:invitationId',
  validateParams(invitationIdParamSchema),
  invitationController.getById,
)
invitationRouter.post(
  '/:invitationId/accept',
  validateParams(invitationIdParamSchema),
  invitationController.acceptById,
)
invitationRouter.post(
  '/:invitationId/decline',
  validateParams(invitationIdParamSchema),
  invitationController.declineById,
)
invitationRouter.post(
  '/:invitationId/cancel',
  validateParams(invitationIdParamSchema),
  invitationController.cancelById,
)
