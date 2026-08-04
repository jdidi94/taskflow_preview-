import type { Response } from 'express'
import { Types } from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { Notification } from '../models/Notification.js'
import { UserPreferences } from '../models/UserPreferences.js'

function parseBooleanString(value: unknown): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export const getNotifications = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    page?: number
    limit?: number
    isRead?: 'true' | 'false'
    type?: string
    priority?: string
  }

  const page = q.page ?? 1
  const limit = q.limit ?? 50

  const filter: Record<string, unknown> = {
    recipient: new Types.ObjectId(req.user!.sub),
  }
  const isRead = parseBooleanString(q.isRead)
  if (isRead !== undefined) filter.isRead = isRead
  if (q.type) filter.type = q.type
  if (q.priority) filter.priority = q.priority

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: new Types.ObjectId(req.user!.sub), isRead: false }),
  ])

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        totalItems: total,
        currentPage: page,
        pages: Math.ceil(total / limit),
      },
    },
  })
})

export const getNotificationStats = asyncHandler(async (req: any, res: Response) => {
  const userId = new Types.ObjectId(req.user!.sub)
  const match = { recipient: userId }

  const [total, unread, byTypeAgg, byPriorityAgg] = await Promise.all([
    Notification.countDocuments(match),
    Notification.countDocuments({ ...match, isRead: false }),
    Notification.aggregate([{ $match: match }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Notification.aggregate([
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
  ])

  const byType: Record<string, number> = {}
  for (const item of byTypeAgg) byType[String(item._id)] = item.count

  const byPriority: Record<string, number> = {}
  for (const item of byPriorityAgg) byPriority[String(item._id)] = item.count

  res.json({ success: true, data: { stats: { total, unread, byType, byPriority } } })
})

export const createNotification = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  if (!userId) throw new AppError('Unauthorized', 401)

  // Admin system endpoint: recipientId is provided in body.
  const { title, message, type, recipientId, priority, relatedEntity } = req.body as {
    title: string
    message: string
    type: string
    recipientId: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    relatedEntity?: { entityType: string; entityId: string }
  }

  const notification = await Notification.create({
    recipient: recipientId,
    sender: userId,
    title,
    message,
    type,
    priority: priority ?? 'medium',
    relatedEntity: relatedEntity
      ? { entityType: relatedEntity.entityType as any, entityId: new Types.ObjectId(relatedEntity.entityId) }
      : null,
    isRead: false,
    metadata: {},
  })

  res.status(201).json({ success: true, data: { notification } })
})

export const createPaymentNotification = asyncHandler(async (req: any, res: Response) => {
  const { title, message, type, category, metadata } = req.body as {
    title: string
    message: string
    type: 'success' | 'info' | 'warning' | 'error'
    category: string
    metadata?: Record<string, unknown>
  }

  // In v3 we don't implement system-wide payment routing; we attach to current user by default.
  const recipientId = req.user!.sub as string

  const notification = await Notification.create({
    recipient: recipientId,
    sender: req.user!.sub,
    title,
    message,
    type: 'payment_update',
    priority: type === 'error' ? 'high' : 'medium',
    relatedEntity: null,
    metadata: { category, paymentType: type, ...(metadata ?? {}) },
  })

  res.status(201).json({ success: true, data: { notification } })
})

export const markAsRead = asyncHandler(async (req: any, res: Response) => {
  const notificationId = req.params.id
  const userId = req.user!.sub as string

  const notification = await Notification.findById(notificationId)
  if (!notification) throw new AppError('Notification not found', 404)

  if (String(notification.recipient) !== userId) throw new AppError('Access denied', 403)

  notification.isRead = true
  notification.readAt = new Date()
  await notification.save()

  res.json({ success: true, data: { notification } })
})

export const markAllAsRead = asyncHandler(async (req: any, res: Response) => {
  const userId = new Types.ObjectId(req.user!.sub)

  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  )

  res.json({ success: true, data: { modifiedCount: result.modifiedCount ?? 0 } })
})

export const bulkMarkAsRead = asyncHandler(async (req: any, res: Response) => {
  const userId = new Types.ObjectId(req.user!.sub)
  const { notificationIds } = req.body as { notificationIds: string[] }

  const result = await Notification.updateMany(
    { _id: { $in: notificationIds }, recipient: userId },
    { $set: { isRead: true, readAt: new Date() } },
  )

  res.json({ success: true, data: { modifiedCount: result.modifiedCount ?? 0 } })
})

export const deleteNotification = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  const notificationId = req.params.id

  const notification = await Notification.findById(notificationId)
  if (!notification) throw new AppError('Notification not found', 404)

  if (String(notification.recipient) !== userId) throw new AppError('Access denied', 403)

  await notification.deleteOne()
  res.json({ success: true })
})

export const clearAllNotifications = asyncHandler(async (req: any, res: Response) => {
  const userId = new Types.ObjectId(req.user!.sub)
  const result = await Notification.deleteMany({ recipient: userId })
  res.json({ success: true, data: { deletedCount: result.deletedCount ?? 0 } })
})

export const clearWorkspaceNotifications = asyncHandler(async (req: any, res: Response) => {
  // v3 doesn't yet model workspaces/archival notifications; keep endpoint functional.
  const userId = new Types.ObjectId(req.user!.sub)
  const result = await Notification.deleteMany({ recipient: userId, type: { $in: ['workspace_archived', 'workspace_restored'] } })
  res.json({ success: true, data: { deletedCount: result.deletedCount ?? 0 } })
})

export const deleteReadNotifications = asyncHandler(async (req: any, res: Response) => {
  const userId = new Types.ObjectId(req.user!.sub)
  const result = await Notification.deleteMany({ recipient: userId, isRead: true })
  res.json({ success: true, data: { deletedCount: result.deletedCount ?? 0 } })
})

export const updatePreferences = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  const { preferences } = req.body as { preferences: unknown }

  const prefsDoc = await UserPreferences.findOne({ userId }) // schema uses userId:ObjectId, but accepts string
  if (!prefsDoc) {
    // Create with defaults; theme/notifications.ai/dashboard/privacy all have defaults in schema.
    const created = await UserPreferences.create({ userId })
    // Best-effort assign notifications preference object.
    await created.updateSection('notifications', preferences)
    res.json({ success: true, data: { preferences: created.notifications } })
    return
  }

  await prefsDoc.updateSection('notifications', preferences)
  res.json({ success: true, data: { preferences: prefsDoc.notifications } })
})

