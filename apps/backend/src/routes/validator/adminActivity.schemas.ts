import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

export const adminNotificationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isRead: z.enum(['true', 'false']).optional(),
  type: z.string().min(1).optional(),
})

export const adminNotificationIdParamsSchema = z.object({
  notificationId: objectIdSchema,
})

export const broadcastAdminNotificationSchema = z.object({
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(500),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  href: z.string().trim().max(300).optional(),
})

export const adminAuditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  action: z.string().min(1).optional(),
  targetType: z.enum(['user', 'admin', 'template', 'token', 'quota', 'system']).optional(),
  q: z.string().trim().max(120).optional(),
})
