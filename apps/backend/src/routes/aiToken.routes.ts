import { Router } from 'express'

import * as aiTokenController from '../controllers/aiToken.controller.js'
import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  aiProviderParamsSchema,
  aiTokenIdParamsSchema,
  aiTokenListQuerySchema,
  createAiTokenSchema,
  updateAiTokenSchema,
} from './validator/aiToken.schemas.js'

export const aiTokenRouter = Router()

aiTokenRouter.use(authenticate, requireAdmin)

aiTokenRouter.get('/', validateQuery(aiTokenListQuerySchema), aiTokenController.getAiTokens)
aiTokenRouter.get('/stats', aiTokenController.getTokenStats)
aiTokenRouter.get('/active/:provider', validateParams(aiProviderParamsSchema), aiTokenController.getActiveToken)
aiTokenRouter.post('/', validateBody(createAiTokenSchema), aiTokenController.createAiToken)
aiTokenRouter.put(
  '/:tokenId',
  validateParams(aiTokenIdParamsSchema),
  validateBody(updateAiTokenSchema),
  aiTokenController.updateAiToken,
)
aiTokenRouter.post(
  '/:tokenId/activate',
  validateParams(aiTokenIdParamsSchema),
  aiTokenController.activateToken,
)
aiTokenRouter.post('/:tokenId/archive', validateParams(aiTokenIdParamsSchema), aiTokenController.archiveToken)
aiTokenRouter.delete('/:tokenId', validateParams(aiTokenIdParamsSchema), aiTokenController.deleteToken)
aiTokenRouter.post('/:tokenId/test', validateParams(aiTokenIdParamsSchema), aiTokenController.testToken)

