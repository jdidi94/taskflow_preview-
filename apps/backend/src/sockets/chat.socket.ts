import type { Server, Socket } from 'socket.io'

import { Admin } from '../models/Admin.js'
import { Chat } from '../models/Chat.js'
import { User } from '../models/User.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'

type ChatSocket = Socket & {
  data: {
    user?: JwtPayload
    chatUserType?: 'admin' | 'user'
    chatIdentity?: {
      id: string
      name: string
      email?: string
      avatar?: string | null
    }
  }
}

async function authenticateNamespaceSocket(socket: ChatSocket, next: (err?: Error) => void) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined)

    if (!token) {
      next(new Error('Authentication required'))
      return
    }

    const decoded = verifyAccessToken(token)
    socket.data.user = decoded

    if (decoded.type === 'admin') {
      const admin = await Admin.findById(decoded.sub).lean()
      if (!admin || !admin.isActive) {
        next(new Error('User not found'))
        return
      }
      socket.data.chatUserType = 'admin'
      socket.data.chatIdentity = {
        id: String(admin._id),
        name: admin.userName,
        email: admin.userEmail,
      }
      next()
      return
    }

    const user = await User.findById(decoded.sub).lean()
    if (!user || !user.isActive) {
      next(new Error('User not found'))
      return
    }
    socket.data.chatUserType = 'user'
    socket.data.chatIdentity = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
    }
    next()
  } catch {
    next(new Error('Authentication failed'))
  }
}

async function updatePresence(userType: 'admin' | 'user', userId: string, isOnline: boolean) {
  const update = {
    ...(isOnline ? { isOnline: true } : { isOnline: false, lastSeen: new Date() }),
  }

  if (userType === 'admin') {
    await Admin.findByIdAndUpdate(userId, update)
    return
  }
  await User.findByIdAndUpdate(userId, update)
}

export function registerChatNamespace(io: Server) {
  const chatNamespace = io.of('/chat')
  chatNamespace.use(authenticateNamespaceSocket)

  chatNamespace.on('connection', (socket: ChatSocket) => {
    const user = socket.data.chatIdentity
    const userType = socket.data.chatUserType
    const userId = socket.data.user?.sub
    if (!user || !userType || !userId) {
      socket.disconnect()
      return
    }

    console.log(`[socket:/chat] connected socket=${socket.id} user=${userId}`)
    socket.join(`user:${userId}`)
    if (userType === 'admin') socket.join('admins')

    socket.on('chat:join-rooms', async () => {
      try {
        const chats = await Chat.find({
          'participants.id': userId,
          'participants.model': userType === 'admin' ? 'Admin' : 'User',
        }).select('_id chatId')

        for (const chat of chats) {
          socket.join(`chat:${chat._id}`)
          socket.join(`chat:${chat.chatId}`)
        }

        socket.emit('chat:rooms-joined', {
          count: chats.length,
          chats: chats.map((chat) => ({ id: chat._id, chatId: chat.chatId })),
        })
      } catch {
        socket.emit('error', { message: 'Failed to join chat rooms' })
      }
    })

    socket.on('chat:join', async (data: { chatId?: string }) => {
      try {
        if (!data?.chatId) {
          socket.emit('error', { message: 'Chat ID is required' })
          return
        }

        const chat = await Chat.findOne({
          _id: data.chatId,
          'participants.id': userId,
        })

        if (!chat) {
          socket.emit('error', { message: 'Chat not found or access denied' })
          return
        }

        socket.join(`chat:${chat._id}`)
        socket.join(`chat:${chat.chatId}`)

        for (const message of chat.messages) {
          if (String(message.sender.id) !== userId && !message.isRead) {
            message.isRead = true
            message.readAt = new Date()
          }
        }
        await chat.save()

        socket.emit('chat:joined', { chatId: chat._id, chatIdString: chat.chatId })
        socket.to(`chat:${chat._id}`).emit('chat:user-joined', {
          chatId: chat._id,
          user: { id: userId, name: user.name, type: userType },
        })
      } catch {
        socket.emit('error', { message: 'Failed to join chat' })
      }
    })

    socket.on('chat:leave', async (data: { chatId?: string }) => {
      try {
        if (!data?.chatId) {
          socket.emit('error', { message: 'Chat ID is required' })
          return
        }
        socket.leave(`chat:${data.chatId}`)
        socket.to(`chat:${data.chatId}`).emit('chat:user-left', {
          chatId: data.chatId,
          user: { id: userId, name: user.name, type: userType },
        })
        socket.emit('chat:left', { chatId: data.chatId })
      } catch {
        socket.emit('error', { message: 'Failed to leave chat' })
      }
    })

    socket.on('chat:typing', (data: { chatId?: string; isTyping?: boolean }) => {
      if (!data?.chatId) return
      socket.to(`chat:${data.chatId}`).emit('chat:user-typing', {
        chatId: data.chatId,
        user: { id: userId, name: user.name, type: userType },
        isTyping: Boolean(data.isTyping),
      })
    })

    socket.on('chat:mark-read', async (data: { chatId?: string; messageIds?: string[] }) => {
      try {
        if (!data?.chatId || !Array.isArray(data.messageIds)) {
          socket.emit('error', { message: 'Invalid parameters' })
          return
        }

        const chat = await Chat.findOne({
          _id: data.chatId,
          'participants.id': userId,
        })
        if (!chat) {
          socket.emit('error', { message: 'Chat not found or access denied' })
          return
        }

        for (const message of chat.messages) {
          if (
            message._id &&
            data.messageIds.includes(String(message._id)) &&
            String(message.sender.id) !== userId
          ) {
            message.isRead = true
            message.readAt = new Date()
          }
        }
        await chat.save()

        socket.to(`chat:${data.chatId}`).emit('chat:messages-read', {
          chatId: data.chatId,
          messageIds: data.messageIds,
          readBy: userId,
        })
        socket.emit('chat:marked-read', { chatId: data.chatId, messageIds: data.messageIds })
      } catch {
        socket.emit('error', { message: 'Failed to mark messages as read' })
      }
    })

    socket.on('chat:get-participants', async (data: { chatId?: string }) => {
      try {
        if (!data?.chatId) {
          socket.emit('error', { message: 'Chat ID is required' })
          return
        }

        const chat = await Chat.findById(data.chatId)
        if (!chat) {
          socket.emit('error', { message: 'Chat not found' })
          return
        }

        socket.emit('chat:participants', {
          chatId: data.chatId,
          participants: chat.participants,
        })
      } catch {
        socket.emit('error', { message: 'Failed to get participants' })
      }
    })

    socket.on('chat:update-status', async (data: { isOnline?: boolean }) => {
      try {
        const isOnline = Boolean(data?.isOnline)
        await updatePresence(userType, userId, isOnline)

        for (const room of socket.rooms) {
          if (!room.startsWith('chat:')) continue
          socket.to(room).emit('chat:user-status', {
            chatId: room.replace('chat:', ''),
            user: {
              id: userId,
              name: user.name,
              type: userType,
              isOnline,
              lastSeen: isOnline ? undefined : new Date(),
            },
          })
        }
      } catch {
        socket.emit('error', { message: 'Failed to update status' })
      }
    })

    socket.on('disconnect', async (reason) => {
      console.log(`[socket:/chat] disconnected socket=${socket.id} user=${userId} reason=${reason}`)
      try {
        await updatePresence(userType, userId, false)
        for (const room of socket.rooms) {
          if (!room.startsWith('chat:')) continue
          socket.to(room).emit('chat:user-status', {
            chatId: room.replace('chat:', ''),
            user: {
              id: userId,
              name: user.name,
              type: userType,
              isOnline: false,
              lastSeen: new Date(),
            },
          })
        }
      } catch {
        // ignore disconnect errors
      }
    })
  })

  ;(io as any).sendChatMessage = async (chatId: string, messageData: unknown) => {
    chatNamespace.to(`chat:${chatId}`).emit('chat:message', { message: messageData, chatId })
  }
  ;(io as any).updateChatStatus = async (chatId: string, statusData: Record<string, unknown>) => {
    chatNamespace.to(`chat:${chatId}`).emit('chat:status-updated', { chatId, ...statusData })
  }
  ;(io as any).assignChat = async (chatId: string, assignmentData: Record<string, unknown>) => {
    chatNamespace.to(`chat:${chatId}`).emit('chat:assigned', { chatId, ...assignmentData })
  }
}

