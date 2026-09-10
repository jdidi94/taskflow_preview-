import { Router } from 'express'

import * as adminActivityController from '../controllers/adminActivity.controller.js'
import * as adminController from '../controllers/admin.controller.js'
import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { makeFileUploadMiddleware } from '../middlewares/fileUpload.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  adminAnalyticsQuerySchema,
  adminChangePasswordSchema,
  adminComplete2FASchema,
  adminDisable2FASchema,
  adminLoginSchema,
  adminTemplateIdParamsSchema,
  adminUpdateProfileSchema,
  adminUserIdParamsSchema,
  adminUsersListQuerySchema,
  adminVerify2FASetupSchema,
  changeManagedUserRoleSchema,
  createAdminOnlySchema,
  createAdminOnlyWithEmailSchema,
  createAdminProjectTemplateSchema,
  createManagedUserSchema,
  resetManagedUserPasswordSchema,
  setupFirstAdminSchema,
  updateAdminProjectTemplateSchema,
  updateManagedUserSchema,
} from './validator/admin.schemas.js'
import {
  adminAuditListQuerySchema,
  adminNotificationIdParamsSchema,
  adminNotificationListQuerySchema,
  broadcastAdminNotificationSchema,
} from './validator/adminActivity.schemas.js'

export const adminRouter = Router()

// Public admin auth
adminRouter.post('/auth/login', validateBody(adminLoginSchema), adminController.login)
adminRouter.post(
  '/auth/login/2fa-complete',
  validateBody(adminComplete2FASchema),
  adminController.completeLoginWith2FA,
)
adminRouter.get('/auth/setup-status', adminController.getSetupStatus)
adminRouter.post(
  '/auth/setup-first-admin',
  validateBody(setupFirstAdminSchema),
  adminController.setupFirstAdmin,
)

adminRouter.use(authenticate, requireAdmin)

// Auth profile
adminRouter.post('/auth/logout', adminController.logout)
adminRouter.get('/auth/me', adminController.getCurrentAdmin)
adminRouter.post(
  '/auth/change-password',
  validateBody(adminChangePasswordSchema),
  adminController.changePassword,
)
adminRouter.put(
  '/auth/profile',
  validateBody(adminUpdateProfileSchema),
  adminController.updateProfile,
)
adminRouter.post(
  '/auth/avatar',
  makeFileUploadMiddleware('avatar', 'single', 'file'),
  adminController.uploadAvatar,
)

// Admin 2FA
adminRouter.get('/2fa/status', adminController.get2FAStatus)
adminRouter.post('/2fa/enable', adminController.enable2FA)
adminRouter.post(
  '/2fa/verify-setup',
  validateBody(adminVerify2FASetupSchema),
  adminController.verify2FASetup,
)
adminRouter.post('/2fa/disable', validateBody(adminDisable2FASchema), adminController.disable2FA)
adminRouter.post('/2fa/backup-codes', adminController.generateBackupCodes)
adminRouter.post('/2fa/recovery-token', adminController.generateRecoveryToken)

// User management
adminRouter.get('/users', validateQuery(adminUsersListQuerySchema), adminController.getUsers)
adminRouter.get('/app-users', validateQuery(adminUsersListQuerySchema), adminController.getAppUsers)
adminRouter.post('/users', validateBody(createManagedUserSchema), adminController.createUser)
adminRouter.post(
  '/users/add-with-email',
  validateBody(createAdminOnlyWithEmailSchema),
  adminController.addUserWithEmail,
)
adminRouter.post('/users/add-admin', validateBody(createAdminOnlySchema), adminController.addAdminUser)
adminRouter.get('/users/available-roles', adminController.getAvailableRoles)
adminRouter.post(
  '/users/reset-password',
  validateBody(resetManagedUserPasswordSchema),
  adminController.resetUserPassword,
)
adminRouter.get('/users/:userId', validateParams(adminUserIdParamsSchema), adminController.getUser)
adminRouter.put(
  '/users/:userId',
  validateParams(adminUserIdParamsSchema),
  validateBody(updateManagedUserSchema),
  adminController.updateUser,
)
adminRouter.post('/users/:userId/ban', validateParams(adminUserIdParamsSchema), adminController.deactivateUser)
adminRouter.post(
  '/users/:userId/activate',
  validateParams(adminUserIdParamsSchema),
  adminController.activateUser,
)
adminRouter.patch(
  '/users/:userId/role',
  validateParams(adminUserIdParamsSchema),
  validateBody(changeManagedUserRoleSchema),
  adminController.changeUserRole,
)

// Analytics + health
adminRouter.get('/analytics', validateQuery(adminAnalyticsQuerySchema), adminController.getAnalytics)
adminRouter.get(
  '/analytics/export',
  validateQuery(adminAnalyticsQuerySchema),
  adminController.exportAnalytics,
)
adminRouter.get('/system/health', adminController.getSystemHealth)

adminRouter.get(
  '/notifications',
  validateQuery(adminNotificationListQuerySchema),
  adminActivityController.listAdminNotifications,
)
adminRouter.get('/notifications/stats', adminActivityController.getAdminNotificationStats)
adminRouter.post(
  '/notifications/broadcast',
  validateBody(broadcastAdminNotificationSchema),
  adminActivityController.broadcastAdminNotification,
)
adminRouter.post('/notifications/mark-all-read', adminActivityController.markAllAdminNotificationsRead)
adminRouter.patch(
  '/notifications/:notificationId/read',
  validateParams(adminNotificationIdParamsSchema),
  adminActivityController.markAdminNotificationRead,
)
adminRouter.delete(
  '/notifications/:notificationId',
  validateParams(adminNotificationIdParamsSchema),
  adminActivityController.deleteAdminNotification,
)
adminRouter.get('/audit-logs', validateQuery(adminAuditListQuerySchema), adminActivityController.listAdminAuditLogs)
adminRouter.get('/audit-logs/stats', adminActivityController.getAdminAuditStats)

// Admin templates
adminRouter.get('/templates/projects', adminController.getProjectTemplates)
adminRouter.post(
  '/templates/projects',
  validateBody(createAdminProjectTemplateSchema),
  adminController.createProjectTemplate,
)
adminRouter.put(
  '/templates/projects/:templateId',
  validateParams(adminTemplateIdParamsSchema),
  validateBody(updateAdminProjectTemplateSchema),
  adminController.updateProjectTemplate,
)
adminRouter.delete(
  '/templates/projects/:templateId',
  validateParams(adminTemplateIdParamsSchema),
  adminController.deleteProjectTemplate,
)
adminRouter.get('/templates/tasks', adminController.getTaskTemplates)
adminRouter.get('/templates/ai-prompts', adminController.getAIPrompts)
adminRouter.get('/templates/branding', adminController.getBrandingAssets)
