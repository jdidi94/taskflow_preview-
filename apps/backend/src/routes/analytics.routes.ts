import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import { requireSpaceMember, requireWorkspaceMember } from '../middlewares/membership.js'
import * as analyticsController from '../controllers/analytics.controller.js'
import {
  analyticsExportQuerySchema,
  analyticsRangeQuerySchema,
  analyticsUserQuerySchema,
  generateSpaceAnalyticsBodySchema,
  spaceAnalyticsParamsSchema,
  workspaceAnalyticsParamsSchema,
} from './validator/analytics.schemas.js'

export const analyticsRouter = Router()

analyticsRouter.use(authenticate)

// Public to authenticated users (no membership required)
analyticsRouter.get('/user', validateQuery(analyticsUserQuerySchema), analyticsController.getUserAnalytics)

// Workspace analytics
analyticsRouter.get(
  '/workspace/:workspaceId',
  validateParams(workspaceAnalyticsParamsSchema),
  validateQuery(analyticsRangeQuerySchema),
  requireWorkspaceMember,
  analyticsController.getWorkspaceAnalytics,
)

// Space analytics
analyticsRouter.get(
  '/space/:spaceId',
  validateParams(spaceAnalyticsParamsSchema),
  validateQuery(analyticsRangeQuerySchema),
  requireSpaceMember,
  analyticsController.getSpaceAnalytics,
)

analyticsRouter.get(
  '/space/:spaceId/team-performance',
  validateParams(spaceAnalyticsParamsSchema),
  validateQuery(analyticsRangeQuerySchema),
  requireSpaceMember,
  analyticsController.getTeamPerformance,
)

analyticsRouter.post(
  '/space/:spaceId/generate',
  validateParams(spaceAnalyticsParamsSchema),
  validateBody(generateSpaceAnalyticsBodySchema),
  requireSpaceMember,
  analyticsController.generateSpaceAnalytics,
)

analyticsRouter.get(
  '/space/:spaceId/export',
  validateParams(spaceAnalyticsParamsSchema),
  validateQuery(analyticsExportQuerySchema),
  requireSpaceMember,
  analyticsController.exportSpaceAnalytics,
)

