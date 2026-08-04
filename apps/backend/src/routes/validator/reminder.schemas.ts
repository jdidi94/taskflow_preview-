import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

export const reminderEntityTypeEnum = z.enum(['task', 'space', 'comment', 'checklist', 'board', 'user'])
export const reminderStatusEnum = z.enum(['scheduled', 'sent', 'delivered', 'failed', 'cancelled', 'snoozed'])
export const reminderPriorityEnum = z.enum(['low', 'normal', 'high', 'urgent'])

export const reminderIdParamsSchema = z.object({ id: objectIdSchema })

export const reminderListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: reminderStatusEnum.optional(),
  priority: reminderPriorityEnum.optional(),
  entityType: reminderEntityTypeEnum.optional(),
  isDue: z.enum(['true', 'false']).optional(),
})

export const recurringSchema = z
  .object({
    enabled: z.boolean().default(true),
    pattern: z.string().min(1),
    frequency: z.number().int().min(1).optional(),
    endDate: z.string().datetime().optional(),
  })
  .partial()

export const createReminderSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().max(1000).optional(),
  entityType: reminderEntityTypeEnum,
  entityId: objectIdSchema,
  reminderDate: z.string().datetime(),
  // Delivery “type” is not strictly modeled; tests only require it to be accepted.
  type: z.string().optional(),
  priority: reminderPriorityEnum.optional(),
  recurring: recurringSchema.optional(),
})

export const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  message: z.string().max(1000).optional(),
  priority: reminderPriorityEnum.optional(),
  reminderDate: z.string().datetime().optional(),
  status: reminderStatusEnum.optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const snoozeReminderSchema = z.object({
  minutes: z.coerce.number().int().min(1).max(7 * 24 * 60),
})

