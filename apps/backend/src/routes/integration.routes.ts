import { Router } from 'express'

import * as integrationController from '../controllers/integration.controller.js'
import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  createIntegrationSchema,
  integrationIdParamsSchema,
  integrationListQuerySchema,
  toggleIntegrationSchema,
  updateIntegrationSchema,
} from './validator/integration.schemas.js'

export const integrationRouter = Router()

integrationRouter.use(authenticate, requireAdmin)

integrationRouter.get('/', validateQuery(integrationListQuerySchema), integrationController.getIntegrations)
integrationRouter.get('/stats', integrationController.getIntegrationStats)
integrationRouter.get('/:id', validateParams(integrationIdParamsSchema), integrationController.getIntegration)
integrationRouter.post('/', validateBody(createIntegrationSchema), integrationController.createIntegration)
integrationRouter.put(
  '/:id',
  validateParams(integrationIdParamsSchema),
  validateBody(updateIntegrationSchema),
  integrationController.updateIntegration,
)
integrationRouter.delete('/:id', validateParams(integrationIdParamsSchema), integrationController.deleteIntegration)
integrationRouter.post('/:id/test', validateParams(integrationIdParamsSchema), integrationController.testIntegration)
integrationRouter.post('/:id/sync', validateParams(integrationIdParamsSchema), integrationController.syncIntegration)
integrationRouter.get(
  '/:id/health',
  validateParams(integrationIdParamsSchema),
  integrationController.getIntegrationHealth,
)
integrationRouter.patch(
  '/:id/toggle',
  validateParams(integrationIdParamsSchema),
  validateBody(toggleIntegrationSchema),
  integrationController.toggleIntegration,
)

