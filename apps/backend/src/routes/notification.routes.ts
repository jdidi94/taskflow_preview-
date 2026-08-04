import { Router } from 'express'

import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import * as notificationController from '../controllers/notification.controller.js'
import {
  bulkMarkReadSchema,
  createNotificationSchema,
  notificationIdParamsSchema,
  notificationListQuerySchema,
  paymentNotificationSchema,
  updatePreferencesSchema,
} from './validator/notification.schemas.js'

export const notificationRouter = Router()
notificationRouter.use(authenticate)

notificationRouter.get('/', validateQuery(notificationListQuerySchema), notificationController.getNotifications)
notificationRouter.get('/stats', notificationController.getNotificationStats)

notificationRouter.post('/', requireAdmin, validateBody(createNotificationSchema), notificationController.createNotification)
notificationRouter.post(
  '/payment-success',
  validateBody(paymentNotificationSchema),
  notificationController.createPaymentNotification,
)

notificationRouter.patch('/:id/read', validateParams(notificationIdParamsSchema), notificationController.markAsRead)

notificationRouter.post('/mark-all-read', notificationController.markAllAsRead)
notificationRouter.patch('/bulk-read', validateBody(bulkMarkReadSchema), notificationController.bulkMarkAsRead)

notificationRouter.post('/clear-read', notificationController.deleteReadNotifications)
notificationRouter.delete('/clear-all', notificationController.clearAllNotifications)
notificationRouter.delete('/clear-workspace', notificationController.clearWorkspaceNotifications)

notificationRouter.put('/preferences', validateBody(updatePreferencesSchema), notificationController.updatePreferences)

notificationRouter.delete('/:id', validateParams(notificationIdParamsSchema), notificationController.deleteNotification)

