import { Router } from 'express'

import { authenticate, requireAdmin } from '../middlewares/auth.js'
import { optionalAuthenticate } from '../middlewares/optionalAuth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import * as chatController from '../controllers/chat.controller.js'
import {
  acceptChatSchema,
  chatHistoryQuerySchema,
  chatIdParamsSchema,
  closeChatSchema,
  markMessagesReadSchema,
  searchChatsQuerySchema,
  sendAdminMessageSchema,
  sendWidgetMessageSchema,
  startChatSchema,
  updateChatStatusSchema,
} from './validator/chat.schemas.js'

export const chatRouter = Router()

chatRouter.post('/widget/start', optionalAuthenticate, validateBody(startChatSchema), chatController.startChat)
chatRouter.post(
  '/widget/:chatId/message',
  optionalAuthenticate,
  validateParams(chatIdParamsSchema),
  validateBody(sendWidgetMessageSchema),
  chatController.sendMessage,
)
chatRouter.get(
  '/widget/:chatId/history',
  validateParams(chatIdParamsSchema),
  validateQuery(chatHistoryQuerySchema),
  chatController.getChatHistory,
)

chatRouter.use('/admin', authenticate, requireAdmin)

chatRouter.get('/admin/active', chatController.getActiveChats)
chatRouter.get('/admin/stats', chatController.getChatStats)
chatRouter.get('/admin/search', validateQuery(searchChatsQuerySchema), chatController.searchChats)
chatRouter.get(
  '/admin/:chatId',
  validateParams(chatIdParamsSchema),
  chatController.getChatById,
)
chatRouter.get(
  '/admin/:chatId/history',
  validateParams(chatIdParamsSchema),
  validateQuery(chatHistoryQuerySchema),
  chatController.getChatHistory,
)
chatRouter.post(
  '/admin/:chatId/accept',
  validateParams(chatIdParamsSchema),
  validateBody(acceptChatSchema),
  chatController.acceptChat,
)
chatRouter.post(
  '/admin/:chatId/messages',
  validateParams(chatIdParamsSchema),
  validateBody(sendAdminMessageSchema),
  chatController.sendAdminMessage,
)
chatRouter.patch(
  '/admin/:chatId/status',
  validateParams(chatIdParamsSchema),
  validateBody(updateChatStatusSchema),
  chatController.updateChatStatus,
)
chatRouter.post(
  '/admin/:chatId/close',
  validateParams(chatIdParamsSchema),
  validateBody(closeChatSchema),
  chatController.closeChat,
)
chatRouter.post(
  '/admin/:chatId/read',
  validateParams(chatIdParamsSchema),
  validateBody(markMessagesReadSchema),
  chatController.markMessagesAsRead,
)

