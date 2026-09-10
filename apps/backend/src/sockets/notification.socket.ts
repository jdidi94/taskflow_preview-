import type { Server, Socket } from 'socket.io'

import { Admin } from '../models/Admin.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'
import { serializeNotification } from '../utils/serializeNotification.js'

type NotificationSocket = Socket & {
  data: {
    user?: JwtPayload
    notificationIdentity?: {
      id: string
      name: string
      email?: string
      avatar?: string | null
      isAdmin: boolean
    }
  }
}

type NotificationNamespace = ReturnType<Server['of']> & {
  sendNotification?: (
    recipientId: string,
    notificationData: Record<string, unknown>,
  ) => Promise<unknown>
  sendBulkNotifications?: (
    notifications: Array<Record<string, unknown> & { recipient: string }>,
  ) => Promise<Array<{ success: boolean; notification?: unknown; error?: string; recipient?: string }>>
  broadcastSystemNotification?: (
    notificationData: Record<string, unknown>,
    userFilter?: Record<string, unknown>,
  ) => Promise<unknown>
}

type NotificationIo = Server & {
  sendNotification?: NotificationNamespace['sendNotification']
  sendBulkNotifications?: NotificationNamespace['sendBulkNotifications']
  broadcastSystemNotification?: NotificationNamespace['broadcastSystemNotification']
}

async function authenticateNotificationSocket(
  socket: NotificationSocket,
  next: (err?: Error) => void,
) {
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
      socket.data.notificationIdentity = {
        id: String(admin._id),
        name: admin.userName,
        email: admin.userEmail,
        avatar: admin.avatar ?? null,
        isAdmin: true,
      }
      next()
      return
    }

    const user = await User.findById(decoded.sub).lean()
    if (!user || !user.isActive) {
      next(new Error('User not found'))
      return
    }

    socket.data.notificationIdentity = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      isAdmin: false,
    }
    next()
  } catch {
    next(new Error('Authentication failed'))
  }
}

function toPlainNotification(doc: any) {
  return serializeNotification(doc)
}

export function registerNotificationNamespace(io: Server) {
  const notificationNamespace = io.of('/notifications') as NotificationNamespace
  notificationNamespace.use(authenticateNotificationSocket)

  notificationNamespace.on('connection', (socket: NotificationSocket) => {
    const identity = socket.data.notificationIdentity
    const userId = socket.data.user?.sub
    if (!identity || !userId) {
      socket.disconnect()
      return
    }

    console.log(`[socket:/notifications] connected socket=${socket.id} user=${userId}`)
    socket.join(`notifications:${userId}`)
    socket.join(`activities:${userId}`)

    socket.on('disconnect', (reason) => {
      console.log(
        `[socket:/notifications] disconnected socket=${socket.id} user=${userId} reason=${reason}`,
      )
    })

    socket.on('test:ping', (data) => {
      socket.emit('test:pong', {
        message: 'Socket is working!',
        echo: data ?? null,
        timestamp: new Date(),
      })
    })

    socket.on('notifications:getUnreadCount', async () => {
      try {
        const count = await Notification.countDocuments({
          recipient: userId,
          isRead: false,
        })
        socket.emit('notifications:unreadCount', { count })
      } catch {
        socket.emit('error', { message: 'Failed to get unread count' })
      }
    })

    // Deprecated: clients should use REST endpoints
    socket.on('notifications:markRead', () => {
      socket.emit('notifications:error', {
        message: 'Deprecated: use PATCH /api/notifications/:id/read',
        code: 'DEPRECATED_ENDPOINT',
      })
    })

    socket.on('notifications:markAllRead', () => {
      socket.emit('notifications:error', {
        message: 'Deprecated: use POST /api/notifications/mark-all-read',
        code: 'DEPRECATED_ENDPOINT',
      })
    })

    socket.on('notifications:getRecent', async (data?: { limit?: number }) => {
      try {
        const limit = Math.min(Math.max(Number(data?.limit ?? 10), 1), 50)
        const notifications = await Notification.find({ recipient: userId })
          .populate('sender', 'name avatar')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean()

        socket.emit('notifications:recent', { notifications })
      } catch {
        socket.emit('error', { message: 'Failed to get recent notifications' })
      }
    })

    socket.on('notifications:subscribe', (data?: { types?: string[] }) => {
      try {
        const types = Array.isArray(data?.types) ? data.types.filter(Boolean) : []
        for (const type of types) {
          socket.join(`notifications:${userId}:${type}`)
        }
        socket.emit('notifications:subscribed', { types })
      } catch {
        socket.emit('error', { message: 'Failed to subscribe to notifications' })
      }
    })

    socket.on('notifications:unsubscribe', (data?: { types?: string[] }) => {
      try {
        const types = Array.isArray(data?.types) ? data.types.filter(Boolean) : []
        for (const type of types) {
          socket.leave(`notifications:${userId}:${type}`)
        }
        socket.emit('notifications:unsubscribed', { types })
      } catch {
        socket.emit('error', { message: 'Failed to unsubscribe from notifications' })
      }
    })

    socket.on(
      'notifications:delivered',
      async (data?: { notificationId?: string; deliveryMethod?: string }) => {
        try {
          const { notificationId, deliveryMethod } = data ?? {}
          if (!notificationId || !deliveryMethod) return

          await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            {
              $set: {
                [`metadata.deliveryStatus.${deliveryMethod}`]: 'delivered',
                [`metadata.deliveredAt.${deliveryMethod}`]: new Date(),
              },
            },
          )
        } catch {
          // Best-effort delivery ack; ignore failures.
        }
      },
    )
  })

  notificationNamespace.sendNotification = async (recipientId, notificationData) => {
    let notificationDoc: any

    if (notificationData && (notificationData as any)._id) {
      notificationDoc = toPlainNotification(notificationData)
    } else {
      const created = await Notification.create({
        ...notificationData,
        recipient: recipientId,
      })
      await created.populate('sender', 'name avatar')
      notificationDoc = toPlainNotification(created)
    }

    notificationNamespace.to(`notifications:${recipientId}`).emit('notification:new', {
      notification: notificationDoc,
    })

    const type = notificationData?.type
    if (typeof type === 'string' && type) {
      notificationNamespace.to(`notifications:${recipientId}:${type}`).emit('notification:typed', {
        notification: notificationDoc,
        type,
      })
    }

    const unreadCount = await Notification.countDocuments({
      recipient: recipientId,
      isRead: false,
    })
    notificationNamespace.to(`notifications:${recipientId}`).emit('notifications:unreadCount', {
      count: unreadCount,
    })

    return notificationDoc
  }

  notificationNamespace.sendBulkNotifications = async (notifications) => {
    const results = []
    for (const notifData of notifications) {
      try {
        const notification = await notificationNamespace.sendNotification!(
          String(notifData.recipient),
          notifData,
        )
        results.push({ success: true, notification })
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send notification',
          recipient: String(notifData.recipient),
        })
      }
    }
    return results
  }

  notificationNamespace.broadcastSystemNotification = async (notificationData, userFilter = {}) => {
    const users = await User.find({ isActive: true, ...userFilter }).select('_id')
    const notifications = users.map((user) => ({
      ...notificationData,
      recipient: String(user._id),
    }))
    return notificationNamespace.sendBulkNotifications!(notifications)
  }

  const typedIo = io as NotificationIo
  typedIo.sendNotification = notificationNamespace.sendNotification
  typedIo.sendBulkNotifications = notificationNamespace.sendBulkNotifications
  typedIo.broadcastSystemNotification = notificationNamespace.broadcastSystemNotification

  return notificationNamespace
}
