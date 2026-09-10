import type { Response } from 'express'
import { Types } from 'mongoose'

import type { AuthedRequest } from '../middlewares/auth.js'
import { Admin } from '../models/Admin.js'
import { AdminAuditLog } from '../models/AdminAuditLog.js'
import { AdminNotification } from '../models/AdminNotification.js'
import {
  notifyActiveAdmins,
  recordAdminAudit,
  serializeAdminAuditLog,
  serializeAdminNotification,
} from '../services/adminAudit.service.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'

type ListQuery = {
  page?: number
  limit?: number
  isRead?: 'true' | 'false'
  type?: string
  action?: string
  targetType?: string
  q?: string
}

function parseBooleanString(value: unknown): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export const listAdminNotifications = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = ((req as any).validatedQuery ?? req.query) as ListQuery
  const page = q.page ?? 1
  const limit = q.limit ?? 20
  const filter: Record<string, unknown> = { recipient: new Types.ObjectId(req.user!.sub) }
  const isRead = parseBooleanString(q.isRead)
  if (isRead !== undefined) filter.isRead = isRead
  if (q.type) filter.type = q.type

  const [notifications, total, unreadCount] = await Promise.all([
    AdminNotification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AdminNotification.countDocuments(filter),
    AdminNotification.countDocuments({ recipient: req.user!.sub, isRead: false }),
  ])

  res.json({
    success: true,
    data: {
      notifications: notifications.map(serializeAdminNotification),
      unreadCount,
      pagination: { page, limit, totalItems: total, pages: Math.ceil(total / limit) },
    },
  })
})

export const getAdminNotificationStats = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const recipient = new Types.ObjectId(req.user!.sub)
  const [total, unread] = await Promise.all([
    AdminNotification.countDocuments({ recipient }),
    AdminNotification.countDocuments({ recipient, isRead: false }),
  ])
  res.json({ success: true, data: { stats: { total, unread } } })
})

export const markAdminNotificationRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const notification = await AdminNotification.findOne({
    _id: param(req, 'notificationId'),
    recipient: req.user!.sub,
  })
  if (!notification) throw new AppError('Notification not found', 404)
  notification.isRead = true
  notification.readAt = new Date()
  await notification.save()
  res.json({ success: true, data: { notification: serializeAdminNotification(notification.toObject()) } })
})

export const markAllAdminNotificationsRead = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await AdminNotification.updateMany(
    { recipient: req.user!.sub, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  )
  res.json({ success: true })
})

export const deleteAdminNotification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const notification = await AdminNotification.findOne({
    _id: param(req, 'notificationId'),
    recipient: req.user!.sub,
  })
  if (!notification) throw new AppError('Notification not found', 404)
  await notification.deleteOne()
  res.json({ success: true })
})

export const broadcastAdminNotification = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const actor = await Admin.findById(req.user!.sub).select('role isActive userName userEmail').lean()
  if (!actor?.isActive || actor.role !== 'super_admin') throw new AppError('Super admin access required', 403)

  const { title, message, priority, href } = req.body as {
    title: string
    message: string
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    href?: string
  }

  await recordAdminAudit(req, {
    action: 'notification.broadcast',
    targetType: 'system',
    summary: `Broadcast notification: ${title}`,
    metadata: { title },
  })

  const created = await notifyActiveAdmins({
    title,
    message,
    type: 'broadcast',
    priority: priority ?? 'medium',
    href: href ?? null,
    metadata: { actorId: req.user!.sub, actorName: actor.userName || actor.userEmail },
  })

  res.status(201).json({ success: true, data: { count: created.length } })
})

export const listAdminAuditLogs = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = ((req as any).validatedQuery ?? req.query) as ListQuery
  const page = q.page ?? 1
  const limit = q.limit ?? 20
  const filter: Record<string, unknown> = {}
  if (q.action) filter.action = q.action
  if (q.targetType) filter.targetType = q.targetType
  if (q.q?.trim()) {
    const term = q.q.trim()
    filter.$or = [
      { summary: { $regex: term, $options: 'i' } },
      { actorName: { $regex: term, $options: 'i' } },
      { actorEmail: { $regex: term, $options: 'i' } },
      { targetLabel: { $regex: term, $options: 'i' } },
      { action: { $regex: term, $options: 'i' } },
    ]
  }

  const [logs, total] = await Promise.all([
    AdminAuditLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AdminAuditLog.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: {
      logs: logs.map(serializeAdminAuditLog),
      pagination: { page, limit, totalItems: total, pages: Math.ceil(total / limit) },
    },
  })
})

export const getAdminAuditStats = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [total, last24h, byAction] = await Promise.all([
    AdminAuditLog.countDocuments(),
    AdminAuditLog.countDocuments({ createdAt: { $gte: since } }),
    AdminAuditLog.aggregate([{ $group: { _id: '$action', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 8 }]),
  ])
  res.json({
    success: true,
    data: {
      stats: {
        total,
        last24h,
        byAction: Object.fromEntries(byAction.map((row) => [String(row._id), row.count])),
      },
    },
  })
})
