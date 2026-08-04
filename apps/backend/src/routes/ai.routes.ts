import { Router } from 'express'

import * as aiController from '../controllers/ai.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { requireBoardMember, requireSpaceMember } from '../middlewares/membership.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  aiBoardParamsSchema,
  aiPerformanceQuerySchema,
  aiRecommendationsQuerySchema,
  aiSpaceParamsSchema,
  naturalLanguageSchema,
  taskDescriptionSchema,
  taskSuggestionsSchema,
  timelineSchema,
} from './validator/ai.schemas.js'

export const aiRouter = Router()

aiRouter.use(authenticate)

aiRouter.post('/suggestions', validateBody(taskSuggestionsSchema), aiController.generateTaskSuggestions)
aiRouter.get(
  '/risks/space/:spaceId',
  validateParams(aiSpaceParamsSchema),
  requireSpaceMember,
  aiController.analyzeTaskRisks,
)
aiRouter.get(
  '/risks/board/:boardId',
  validateParams(aiBoardParamsSchema),
  requireBoardMember,
  aiController.analyzeTaskRisks,
)
aiRouter.post('/parse', validateBody(naturalLanguageSchema), aiController.parseNaturalLanguage)
aiRouter.post(
  '/timeline/:spaceId',
  validateParams(aiSpaceParamsSchema),
  validateBody(timelineSchema),
  requireSpaceMember,
  aiController.generateSpaceTimeline,
)
aiRouter.get(
  '/recommendations/:spaceId',
  validateParams(aiSpaceParamsSchema),
  validateQuery(aiRecommendationsQuerySchema),
  requireSpaceMember,
  aiController.getSmartRecommendations,
)
aiRouter.get(
  '/performance/:spaceId',
  validateParams(aiSpaceParamsSchema),
  validateQuery(aiPerformanceQuerySchema),
  requireSpaceMember,
  aiController.analyzeTeamPerformance,
)
aiRouter.post('/description', validateBody(taskDescriptionSchema), aiController.generateTaskDescription)

