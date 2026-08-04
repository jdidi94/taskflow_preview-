import { Router } from 'express'

import * as adminManagementController from '../controllers/adminManagement.controller.js'
import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  adminIdParamsSchema,
  adminListQuerySchema,
  changeAdminPasswordSchema,
  createAdminSchema,
  toggleAdminStatusSchema,
  updateAdminSchema,
} from './validator/adminManagement.schemas.js'

export const adminManagementRouter = Router()

adminManagementRouter.use(authenticate, requireAdmin)

adminManagementRouter.post('/create', validateBody(createAdminSchema), adminManagementController.createAdmin)
adminManagementRouter.get('/list', validateQuery(adminListQuerySchema), adminManagementController.getAllAdmins)
adminManagementRouter.get('/stats/overview', adminManagementController.getAdminStats)
adminManagementRouter.get('/:id', validateParams(adminIdParamsSchema), adminManagementController.getAdminById)
adminManagementRouter.put(
  '/:id',
  validateParams(adminIdParamsSchema),
  validateBody(updateAdminSchema),
  adminManagementController.updateAdmin,
)
adminManagementRouter.delete('/:id', validateParams(adminIdParamsSchema), adminManagementController.deleteAdmin)
adminManagementRouter.patch(
  '/:id/password',
  validateParams(adminIdParamsSchema),
  validateBody(changeAdminPasswordSchema),
  adminManagementController.changeAdminPassword,
)
adminManagementRouter.patch(
  '/:id/toggle-status',
  validateParams(adminIdParamsSchema),
  validateBody(toggleAdminStatusSchema),
  adminManagementController.toggleAdminStatus,
)

