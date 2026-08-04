import { Router } from 'express'

import { authenticate } from '../middlewares/auth.js'
import { optionalAuthenticate } from '../middlewares/optionalAuth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import * as templateController from '../controllers/template.controller.js'
import {
  createTemplateSchema,
  templateIdParamsSchema,
  templateListQuerySchema,
  updateTemplateSchema,
} from './validator/template.schemas.js'

export const templateRouter = Router()

// Public list + get (private templates still require access checks in controller)
templateRouter.get('/', optionalAuthenticate, validateQuery(templateListQuerySchema), templateController.list)
templateRouter.get(
  '/:id',
  optionalAuthenticate,
  validateParams(templateIdParamsSchema),
  templateController.getById,
)

// Mutations require auth
templateRouter.post('/', authenticate, validateBody(createTemplateSchema), templateController.create)
templateRouter.patch('/:id', authenticate, validateParams(templateIdParamsSchema), validateBody(updateTemplateSchema), templateController.update)
templateRouter.put('/:id', authenticate, validateParams(templateIdParamsSchema), validateBody(updateTemplateSchema), templateController.update)
templateRouter.delete('/:id', authenticate, validateParams(templateIdParamsSchema), templateController.remove)

// Engagement
templateRouter.post('/:id/views', authenticate, validateParams(templateIdParamsSchema), templateController.incrementViews)
templateRouter.post('/:id/like', authenticate, validateParams(templateIdParamsSchema), templateController.toggleLike)

