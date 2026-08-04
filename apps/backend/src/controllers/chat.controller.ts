import type { Response } from 'express'
import { Types } from 'mongoose'

import type { AuthedRequest } from '../middlewares/auth.js'
import { Admin } from '../models/Admin.js'
import { Chat, type ChatCategory, type ChatMessageType, type ChatPriority } from '../models/Chat.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'

type RequestWithValidatedQuery = AuthedRequest & {
  validatedQuery?: {
    limit?: number
    query?: string
    status?: string
    priority?: string
    category?: string
    assignedTo?: string
    dateFrom?: string
    dateTo?: string
  }
}

type SenderIdentity = {
  id: Types.ObjectId
  model: 'User' | 'Admin'
  name: string
  email?: string
  avatar?: string | null
}

function chatNamespace(req: AuthedRequest): any {
  const io = req.app.get('io') as any
  return io?.of('/chat')
}

function emitChatEvent(req: AuthedRequest, event: string, payload: Record<string, unknown>) {
  const namespace = chatNamespace(req)
  namespace?.emit(event, payload)
}

function emitChatRoomEvent(
  req: AuthedRequest,
  room: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const namespace = chatNamespace(req)
  namespace?.to(room).emit(event, payload)
}

function normalizeLimit(value: number | undefined, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function resolveSenderName(inputName: string | undefined, identity: SenderIdentity) {
  return inputName?.trim() || identity.name || 'Anonymous'
}

async function getAuthenticatedIdentity(req: AuthedRequest): Promise<SenderIdentity | null> {
  const user = req.user
  if (!user?.sub) return null

  if (user.type === 'admin') {
    const admin = await Admin.findById(user.sub).lean()
    if (!admin || !admin.isActive) return null
    return {
      id: new Types.ObjectId(String(admin._id)),
      model: 'Admin',
      name: admin.userName || user.name || 'Admin',
      email: admin.userEmail || user.email,
    }
  }

  const member = await User.findById(user.sub).lean()
  if (!member || !member.isActive) return null
  return {
    id: new Types.ObjectId(String(member._id)),
    model: 'User',
    name: member.name || user.name || 'User',
    email: member.email || user.email,
    avatar: member.avatar ?? null,
  }
}

function getAnonymousIdentity(name?: string, email?: string): SenderIdentity {
  return {
    id: new Types.ObjectId(),
    model: 'User',
    name: name?.trim() || 'Anonymous',
    email: email?.trim(),
    avatar: null,
  }
}

function buildMessage(
  sender: SenderIdentity,
  content: string,
  messageType: ChatMessageType = 'text',
  attachments?: Array<Record<string, unknown>>,
  meta?: { ipAddress?: string; userAgent?: string },
) {
  return {
    sender: {
      id: sender.id,
      model: sender.model,
      name: sender.name,
      avatar: sender.avatar ?? null,
    },
    content,
    messageType,
    attachments:
      attachments?.map((attachment) => ({
        filename: typeof attachment.filename === 'string' ? attachment.filename : undefined,
        originalName:
          typeof attachment.originalName === 'string' ? attachment.originalName : undefined,
        mimeType: typeof attachment.mimeType === 'string' ? attachment.mimeType : undefined,
        size: typeof attachment.size === 'number' ? attachment.size : undefined,
        url: typeof attachment.url === 'string' ? attachment.url : undefined,
      })) ?? [],
    isRead: false,
    readAt: null,
    metadata: {
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  }
}

function ensureParticipant(chat: any, sender: SenderIdentity) {
  const exists = chat.participants.some(
    (participant: any) =>
      String(participant.id) === String(sender.id) && participant.model === sender.model,
  )

  if (!exists) {
    chat.participants.push({
      id: sender.id,
      model: sender.model,
      name: sender.name,
      email: sender.email,
      avatar: sender.avatar ?? null,
      isOnline: false,
      lastSeen: null,
    })
  }
}

async function getChatOr404(chatId: string) {
  const chat = await Chat.findById(chatId)
  if (!chat) throw new AppError('Chat not found', 404)
  return chat
}

function userCanAccessWidgetChat(chat: any, sender: SenderIdentity | null, email?: string) {
  if (!sender && !email) return false
  return chat.participants.some((participant: any) => {
    if (sender && String(participant.id) === String(sender.id) && participant.model === sender.model) {
      return true
    }
    return Boolean(email && participant.email && participant.email === email)
  })
}

export const startChat = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { name, email, message, category, priority } = req.body as {
    name?: string
    email?: string
    message: string
    category?: ChatCategory
    priority?: ChatPriority
  }

  const authenticated = await getAuthenticatedIdentity(req)
  const starter = authenticated ?? getAnonymousIdentity(name, email)

  if (!authenticated && (!name?.trim() || !email?.trim())) {
    throw new AppError('Name, email, and message are required', 400)
  }

  const chat = await Chat.create({
    chatId: `chat_${Date.now()}`,
    participants: [
      {
        id: starter.id,
        model: starter.model,
        name: resolveSenderName(name, starter),
        email: starter.email ?? email?.trim(),
        avatar: starter.avatar ?? null,
        isOnline: false,
        lastSeen: null,
      },
    ],
    messages: [
      buildMessage(
        {
          ...starter,
          name: resolveSenderName(name, starter),
        },
        message,
        'text',
        [],
        {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        },
      ),
    ],
    status: 'pending',
    priority: priority ?? 'medium',
    category: category ?? 'general',
  })

  emitChatEvent(req, 'admin:new-chat-request', {
    chatId: chat._id,
    user: {
      _id: starter.id,
      name: resolveSenderName(name, starter),
      email: starter.email ?? email?.trim(),
      model: starter.model,
    },
    message,
    category: chat.category,
    priority: chat.priority,
    timestamp: new Date(),
  })

  res.status(201).json({ success: true, data: { chat } })
})

export const sendMessage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const { content, name, email, messageType, attachments } = req.body as {
    content: string
    name?: string
    email?: string
    messageType?: ChatMessageType
    attachments?: Array<Record<string, unknown>>
  }

  const chat = await getChatOr404(chatId)
  const authenticated = await getAuthenticatedIdentity(req)
  const sender = authenticated ?? getAnonymousIdentity(name, email)

  if (!authenticated && !userCanAccessWidgetChat(chat, sender, email?.trim())) {
    throw new AppError('Access denied', 403)
  }

  ensureParticipant(chat, {
    ...sender,
    name: resolveSenderName(name, sender),
    email: sender.email ?? email?.trim(),
  })

  const builtMessage = buildMessage(
    {
      ...sender,
      name: resolveSenderName(name, sender),
    },
    content,
    messageType ?? 'text',
    attachments,
    {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    },
  )

  chat.messages.push(builtMessage as any)
  await chat.save()

  const message = chat.messages[chat.messages.length - 1]
  emitChatRoomEvent(req, `chat:${chatId}`, 'chat:message', { chatId, message })
  emitChatRoomEvent(req, `chat:${chat.chatId}`, 'chat:message', { chatId, message })

  res.json({ success: true, data: { message } })
})

export const getActiveChats = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const chats = await Chat.find({ status: { $in: ['pending', 'active'] } }).sort({ updatedAt: -1 })
  res.json({ success: true, data: { chats } })
})

export const getChatStats = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const chats = await Chat.find().lean()

  const totalChats = chats.length
  const activeChats = chats.filter((chat) => chat.status === 'active').length
  const pendingChats = chats.filter((chat) => chat.status === 'pending').length
  const resolvedChats = chats.filter((chat) => chat.status === 'resolved').length
  const closedChats = chats.filter((chat) => chat.status === 'closed').length
  const totalMessages = chats.reduce((sum, chat: any) => sum + (chat.messages?.length ?? 0), 0)

  const activeChatsWithMessages = chats.filter(
    (chat: any) => chat.status === 'active' && (chat.messages?.length ?? 0) > 1,
  )

  let totalResponseTime = 0
  let responseCount = 0
  for (const chat of activeChatsWithMessages as any[]) {
    const userMessages = (chat.messages ?? []).filter((m: any) => m.sender?.model === 'User')
    const adminMessages = (chat.messages ?? []).filter((m: any) => m.sender?.model === 'Admin')
    if (userMessages.length > 0 && adminMessages.length > 0) {
      const firstUserMessage = userMessages[0]
      const firstAdminResponse = adminMessages[0]
      if (
        firstAdminResponse?.createdAt &&
        firstUserMessage?.createdAt &&
        new Date(firstAdminResponse.createdAt).getTime() > new Date(firstUserMessage.createdAt).getTime()
      ) {
        totalResponseTime +=
          (new Date(firstAdminResponse.createdAt).getTime() -
            new Date(firstUserMessage.createdAt).getTime()) /
          (1000 * 60)
        responseCount += 1
      }
    }
  }

  const totalUnread = chats.reduce(
    (sum, chat: any) =>
      sum +
      (chat.messages ?? []).filter((m: any) => !m.isRead && m.sender?.model === 'User').length,
    0,
  )

  const chatsByCategory: Record<string, number> = {}
  const chatsByPriority: Record<string, number> = {}
  for (const chat of chats as any[]) {
    const category = chat.category || 'other'
    chatsByCategory[category] = (chatsByCategory[category] ?? 0) + 1
    const priority = chat.priority || 'medium'
    chatsByPriority[priority] = (chatsByPriority[priority] ?? 0) + 1
  }

  res.json({
    success: true,
    data: {
      stats: {
        totalChats,
        activeChats,
        pendingChats,
        resolvedChats,
        closedChats,
        totalMessages,
        averageResponseTime: Math.round(responseCount > 0 ? totalResponseTime / responseCount : 0),
        totalUnread,
        chatsByCategory,
        chatsByPriority,
      },
    },
  })
})

export const acceptChat = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const chat = await getChatOr404(chatId)

  if (chat.status !== 'pending') throw new AppError('Chat is not pending', 400)

  const admin = await Admin.findById(req.user!.sub).lean()
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)

  ensureParticipant(chat, {
    id: new Types.ObjectId(req.user!.sub),
    model: 'Admin',
    name: admin.userName || req.user?.name || 'Admin',
    email: admin.userEmail || req.user?.email,
  })

  chat.status = 'active'
  chat.assignedTo = new Types.ObjectId(req.user!.sub)
  await chat.save()

  emitChatEvent(req, 'admin:chat-accepted', { chatId, adminId: req.user!.sub })
  emitChatRoomEvent(req, `chat:${chatId}`, 'chat:assigned', { chatId, adminId: req.user!.sub })

  res.json({ success: true, data: { chat } })
})

export const sendAdminMessage = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const { content, messageType, attachments } = req.body as {
    content: string
    messageType?: ChatMessageType
    attachments?: Array<Record<string, unknown>>
  }

  const chat = await getChatOr404(chatId)
  if (chat.status === 'closed') throw new AppError('Cannot send message to closed chat', 400)

  const admin = await Admin.findById(req.user!.sub).lean()
  if (!admin || !admin.isActive) throw new AppError('Admin not found', 404)

  const sender: SenderIdentity = {
    id: new Types.ObjectId(req.user!.sub),
    model: 'Admin',
    name: admin.userName || req.user?.name || 'Admin',
    email: admin.userEmail || req.user?.email,
  }

  ensureParticipant(chat, sender)

  chat.messages.push(
    buildMessage(sender, content, messageType ?? 'text', attachments, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }) as any,
  )
  await chat.save()

  const message = chat.messages[chat.messages.length - 1]
  emitChatRoomEvent(req, `chat:${chatId}`, 'chat:message', { chatId, message })
  emitChatRoomEvent(req, `chat:${chat.chatId}`, 'chat:message', { chatId, message })

  res.json({ success: true, data: { message } })
})

export const updateChatStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const { status, reason } = req.body as { status: string; reason?: string }
  const chat = await getChatOr404(chatId)

  chat.status = status as any
  if (reason) chat.notes = reason
  await chat.save()

  emitChatEvent(req, 'chat:status-updated', {
    chatId,
    status,
    updatedBy: req.user!.sub,
    timestamp: new Date(),
  })
  emitChatRoomEvent(req, `chat:${chatId}`, 'chat:status-updated', {
    chatId,
    status,
    updatedBy: req.user!.sub,
    timestamp: new Date(),
  })

  res.json({ success: true, data: { chat } })
})

export const closeChat = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const { reason } = req.body as { reason?: string }
  const chat = await getChatOr404(chatId)

  chat.status = 'closed'
  if (reason) chat.notes = reason
  await chat.save()

  emitChatEvent(req, 'chat:closed', { chatId, reason })
  emitChatRoomEvent(req, `chat:${chatId}`, 'chat:status-updated', {
    chatId,
    status: 'closed',
    reason,
    updatedBy: req.user?.sub,
    timestamp: new Date(),
  })

  res.json({ success: true, data: { chat } })
})

export const getChatHistory = asyncHandler(async (req: RequestWithValidatedQuery, res: Response) => {
  const chatId = param(req, 'chatId')
  const chat = await getChatOr404(chatId)
  const q = req.validatedQuery ?? {}
  const limit = normalizeLimit(q.limit, 50)

  const messages = [...chat.messages]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .reverse()

  res.json({ success: true, data: { messages } })
})

export const markMessagesAsRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const { messageIds } = req.body as { messageIds: string[] }
  const chat = await getChatOr404(chatId)

  for (const message of chat.messages) {
    if (message._id && messageIds.includes(String(message._id))) {
      message.isRead = true
      message.readAt = new Date()
    }
  }

  await chat.save()
  emitChatRoomEvent(req, `chat:${chatId}`, 'chat:messages-read', {
    chatId,
    messageIds,
    readBy: req.user?.sub,
  })

  res.json({ success: true })
})

export const searchChats = asyncHandler(async (req: RequestWithValidatedQuery, res: Response) => {
  const q = req.validatedQuery ?? {}
  const criteria: Record<string, unknown> = {}

  if (q.query) {
    criteria.$or = [
      { 'participants.name': { $regex: q.query, $options: 'i' } },
      { 'participants.email': { $regex: q.query, $options: 'i' } },
      { 'messages.content': { $regex: q.query, $options: 'i' } },
    ]
  }
  if (q.status) criteria.status = q.status
  if (q.priority) criteria.priority = q.priority
  if (q.category) criteria.category = q.category
  if (q.assignedTo) criteria.assignedTo = new Types.ObjectId(q.assignedTo)
  if (q.dateFrom || q.dateTo) {
    criteria.createdAt = {
      ...(q.dateFrom ? { $gte: new Date(q.dateFrom) } : {}),
      ...(q.dateTo ? { $lte: new Date(q.dateTo) } : {}),
    }
  }

  const chats = await Chat.find(criteria).sort({ updatedAt: -1 })
  res.json({ success: true, data: { chats } })
})

export const getChatById = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const chatId = param(req, 'chatId')
  const chat = await getChatOr404(chatId)
  res.json({ success: true, data: { chat } })
})

