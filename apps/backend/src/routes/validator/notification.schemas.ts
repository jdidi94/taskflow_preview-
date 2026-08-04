import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

const notificationPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isRead: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
  priority: notificationPriorityEnum.optional(),
})

export const notificationIdParamsSchema = z.object({ id: objectIdSchema })

export const createNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  type: z.string().min(1),
  recipientId: objectIdSchema,
  priority: notificationPriorityEnum.optional(),
  relatedEntity: z
    .object({
      entityType: z.enum(['task', 'board', 'space', 'comment', 'user', 'workspace', 'template']),
      entityId: objectIdSchema,
    })
    .optional(),
})

export const paymentNotificationSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  type: z.enum(['success', 'info', 'warning', 'error']),
  category: z.enum(['billing', 'payment', 'subscription']),
  metadata: z.record(z.unknown()).optional(),
})

export const bulkMarkReadSchema = z.object({
  notificationIds: z.array(objectIdSchema).min(1),
})

export const updatePreferencesSchema = z.object({
  preferences: z.record(z.unknown()),
})

