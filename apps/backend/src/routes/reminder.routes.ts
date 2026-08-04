import { Router } from 'express'

import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import * as reminderController from '../controllers/reminder.controller.js'
import {
  createReminderSchema,
  reminderIdParamsSchema,
  reminderListQuerySchema,
  snoozeReminderSchema,
  updateReminderSchema,
} from './validator/reminder.schemas.js'

export const reminderRouter = Router()
reminderRouter.use(authenticate)

reminderRouter.get('/stats', reminderController.getReminderStats)
reminderRouter.get('/', validateQuery(reminderListQuerySchema), reminderController.getReminders)

reminderRouter.get('/:id', validateParams(reminderIdParamsSchema), reminderController.getReminder)

reminderRouter.post('/', validateBody(createReminderSchema), reminderController.createReminder)
reminderRouter.put('/:id', validateParams(reminderIdParamsSchema), validateBody(updateReminderSchema), reminderController.updateReminder)
reminderRouter.delete('/:id', validateParams(reminderIdParamsSchema), reminderController.deleteReminder)

reminderRouter.patch(
  '/:id/snooze',
  validateParams(reminderIdParamsSchema),
  validateBody(snoozeReminderSchema),
  reminderController.snoozeReminder,
)

reminderRouter.post('/process-due', requireAdmin, reminderController.processDueReminders)

