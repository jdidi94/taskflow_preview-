import { Router } from 'express'

import * as adminManagementController from '../controllers/adminManagement.controller.js'
import { authenticate, requireAdmin, requireSuperAdmin } from '../middlewares/auth.js'
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

adminManagementRouter.get('/list', validateQuery(adminListQuerySchema), adminManagementController.getAllAdmins)
adminManagementRouter.get('/stats/overview', adminManagementController.getAdminStats)
adminManagementRouter.get('/:id', validateParams(adminIdParamsSchema), adminManagementController.getAdminById)

adminManagementRouter.post(
  '/create',
  requireSuperAdmin,
  validateBody(createAdminSchema),
  adminManagementController.createAdmin,
)
adminManagementRouter.put(
  '/:id',
  requireSuperAdmin,
  validateParams(adminIdParamsSchema),
  validateBody(updateAdminSchema),
  adminManagementController.updateAdmin,
)
adminManagementRouter.delete(
  '/:id',
  requireSuperAdmin,
  validateParams(adminIdParamsSchema),
  adminManagementController.deleteAdmin,
)
adminManagementRouter.patch(
  '/:id/password',
  requireSuperAdmin,
  validateParams(adminIdParamsSchema),
  validateBody(changeAdminPasswordSchema),
  adminManagementController.changeAdminPassword,
)
adminManagementRouter.patch(
  '/:id/toggle-status',
  requireSuperAdmin,
  validateParams(adminIdParamsSchema),
  validateBody(toggleAdminStatusSchema),
  adminManagementController.toggleAdminStatus,
)

