import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

const chatMessageTypeEnum = z.enum(['text', 'file', 'image', 'system'])
const chatStatusEnum = z.enum(['active', 'resolved', 'closed', 'pending'])
const chatCategoryEnum = z.enum([
  'general',
  'technical',
  'billing',
  'feature_request',
  'bug_report',
  'other',
])
const chatPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent'])

const chatAttachmentSchema = z.object({
  filename: z.string().optional(),
  originalName: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  url: z.string().optional(),
})

export const chatIdParamsSchema = z.object({ chatId: objectIdSchema })

export const chatHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export const startChatSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  message: z.string().min(1).max(5000),
  category: chatCategoryEnum.optional(),
  priority: chatPriorityEnum.optional(),
})

export const sendWidgetMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  messageType: chatMessageTypeEnum.optional(),
  attachments: z.array(chatAttachmentSchema).max(10).optional(),
})

export const acceptChatSchema = z.object({}).passthrough()

export const sendAdminMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  messageType: chatMessageTypeEnum.optional(),
  attachments: z.array(chatAttachmentSchema).max(10).optional(),
})

export const updateChatStatusSchema = z.object({
  status: chatStatusEnum,
  reason: z.string().max(2000).optional(),
})

export const closeChatSchema = z.object({
  reason: z.string().max(2000).optional(),
})

export const markMessagesReadSchema = z.object({
  messageIds: z.array(objectIdSchema).min(1).max(500),
})

export const searchChatsQuerySchema = z.object({
  query: z.string().min(1).optional(),
  status: chatStatusEnum.optional(),
  priority: chatPriorityEnum.optional(),
  category: chatCategoryEnum.optional(),
  assignedTo: objectIdSchema.optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

