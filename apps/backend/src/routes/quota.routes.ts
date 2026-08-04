import { Router } from 'express'

import * as quotaController from '../controllers/quota.controller.js'
import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  createQuotaSchema,
  overrideQuotaSchema,
  quotaIdParamsSchema,
  quotaListQuerySchema,
  quotaStatsQuerySchema,
  updateQuotaSchema,
} from './validator/quota.schemas.js'

export const quotaRouter = Router()

quotaRouter.use(authenticate, requireAdmin)

quotaRouter.get('/', validateQuery(quotaListQuerySchema), quotaController.listQuotas)
quotaRouter.get('/stats', validateQuery(quotaStatsQuerySchema), quotaController.getQuotaStats)
quotaRouter.get('/:id', validateParams(quotaIdParamsSchema), quotaController.getQuota)
quotaRouter.post('/', validateBody(createQuotaSchema), quotaController.createQuota)
quotaRouter.put(
  '/:id',
  validateParams(quotaIdParamsSchema),
  validateBody(updateQuotaSchema),
  quotaController.updateQuota,
)
quotaRouter.post(
  '/:id/override',
  validateParams(quotaIdParamsSchema),
  validateBody(overrideQuotaSchema),
  quotaController.overrideQuota,
)
quotaRouter.delete(
  '/:id/override',
  validateParams(quotaIdParamsSchema),
  quotaController.clearQuotaOverride,
)
quotaRouter.post('/:id/reset', validateParams(quotaIdParamsSchema), quotaController.resetQuota)
quotaRouter.delete('/:id', validateParams(quotaIdParamsSchema), quotaController.deleteQuota)
