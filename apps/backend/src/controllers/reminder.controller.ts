import type { Response } from 'express'
import { Types } from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { Reminder } from '../models/Reminder.js'
import type { ReminderEntityType, ReminderPriority, ReminderStatus } from '../models/Reminder.js'

function parseBooleanString(value: unknown): boolean | undefined {
  if (value === 'true') return true
  if (value === 'false') return false
  return undefined
}

export const getReminders = asyncHandler(async (req: any, res: Response) => {
  const q = (req.validatedQuery ?? req.query) as {
    page?: number
    limit?: number
    status?: ReminderStatus
    priority?: ReminderPriority
    entityType?: ReminderEntityType
    isDue?: 'true' | 'false'
  }

  const page = q.page ?? 1
  const limit = q.limit ?? 50
  const userId = new Types.ObjectId(req.user!.sub)

  const filter: Record<string, unknown> = { userId, isActive: true }
  if (q.status) filter.status = q.status
  if (q.priority) filter.priority = q.priority
  if (q.entityType) filter.entityType = q.entityType

  const isDue = parseBooleanString(q.isDue)
  if (isDue) {
    ;(filter as any).scheduledAt = { $lte: new Date() }
    ;(filter as any).status = 'scheduled'
  }

  const [reminders, total] = await Promise.all([
    Reminder.find(filter).sort({ scheduledAt: 1 }).limit(limit).skip((page - 1) * limit).lean(),
    Reminder.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: {
      reminders,
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

export const getReminder = asyncHandler(async (req: any, res: Response) => {
  const reminderId = req.params.id
  const userId = req.user!.sub as string

  const reminder = await Reminder.findById(reminderId)
  if (!reminder) throw new AppError('Reminder not found', 404)
  if (String(reminder.userId) !== userId) throw new AppError('Access denied', 403)

  res.json({ success: true, data: { reminder } })
})

export const createReminder = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  const { title, message, entityType, entityId, reminderDate, type, priority, recurring } = req.body as {
    title: string
    message?: string
    entityType: ReminderEntityType
    entityId: string
    reminderDate: string
    type?: string
    priority?: ReminderPriority
    recurring?: any
  }

  const scheduledAt = new Date(reminderDate)
  if (scheduledAt.getTime() <= Date.now()) throw new AppError('Reminder date must be in the future', 400)

  const repeat =
    recurring && recurring.enabled
      ? {
          enabled: true,
          frequency: recurring.pattern ?? 'daily',
          pattern: recurring.pattern,
          endDate: recurring.endDate ? new Date(recurring.endDate) : undefined,
        }
      : undefined

  const reminder = await Reminder.create({
    userId,
    entityType,
    entityId,
    title,
    message: message ?? '',
    method: type ? [type] : ['push'],
    scheduledAt,
    priority: priority ?? 'normal',
    status: 'scheduled',
    repeat: repeat ?? { enabled: false },
    nextOccurrence: repeat ? scheduledAt : null,
    snoozeInfo: { snoozeCount: 0, maxSnoozes: 3 },
    isActive: true,
  })

  res.status(201).json({ success: true, data: { reminder } })
})

export const updateReminder = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  const reminderId = req.params.id
  const { title, message, priority, reminderDate, status } = req.body as {
    title?: string
    message?: string
    priority?: ReminderPriority
    reminderDate?: string
    status?: ReminderStatus
  }

  const reminder = await Reminder.findById(reminderId)
  if (!reminder) throw new AppError('Reminder not found', 404)
  if (String(reminder.userId) !== userId) throw new AppError('Access denied', 403)

  if (title !== undefined) reminder.title = title
  if (message !== undefined) reminder.message = message
  if (priority !== undefined) reminder.priority = priority
  if (status !== undefined) reminder.status = status

  if (reminderDate !== undefined) {
    const scheduledAt = new Date(reminderDate)
    if (scheduledAt.getTime() <= Date.now()) throw new AppError('Reminder date must be in the future', 400)
    reminder.scheduledAt = scheduledAt
  }

  await reminder.save()
  res.json({ success: true, data: { reminder } })
})

export const deleteReminder = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  const reminderId = req.params.id

  const reminder = await Reminder.findById(reminderId)
  if (!reminder) throw new AppError('Reminder not found', 404)
  if (String(reminder.userId) !== userId) throw new AppError('Access denied', 403)

  await reminder.deleteOne()
  res.json({ success: true })
})

export const snoozeReminder = asyncHandler(async (req: any, res: Response) => {
  const userId = req.user!.sub as string
  const reminderId = req.params.id
  const { minutes } = req.body as { minutes: number }

  const reminder = await Reminder.findById(reminderId)
  if (!reminder) throw new AppError('Reminder not found', 404)
  if (String(reminder.userId) !== userId) throw new AppError('Access denied', 403)

  const max = reminder.snoozeInfo?.maxSnoozes ?? 3
  const current = reminder.snoozeInfo?.snoozeCount ?? 0
  if (current >= max) throw new AppError('Max snoozes reached', 400)

  const now = new Date()
  const until = new Date(now.getTime() + minutes * 60_000)

  reminder.status = 'snoozed'
  reminder.snoozeInfo = {
    ...reminder.snoozeInfo,
    snoozedAt: now,
    snoozedUntil: until,
    snoozeCount: current + 1,
    maxSnoozes: max,
  }

  await reminder.save()
  res.json({ success: true, data: { reminder } })
})

export const getReminderStats = asyncHandler(async (req: any, res: Response) => {
  const userId = new Types.ObjectId(req.user!.sub)
  const match = { userId, isActive: true }

  const [total, byStatusAgg, byPriorityAgg] = await Promise.all([
    Reminder.countDocuments(match),
    Reminder.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Reminder.aggregate([
      { $match: match },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
  ])

  const byStatus: Record<string, number> = {}
  for (const item of byStatusAgg) byStatus[String(item._id)] = item.count

  const byPriority: Record<string, number> = {}
  for (const item of byPriorityAgg) byPriority[String(item._id)] = item.count

  res.json({ success: true, data: { stats: { total, byStatus, byPriority } } })
})

export const processDueReminders = asyncHandler(async (_req: any, res: Response) => {
  // System endpoint: due reminders scheduledAt <= now and status scheduled.
  const now = new Date()
  const result = await Reminder.updateMany(
    { scheduledAt: { $lte: now }, status: 'scheduled', isActive: true },
    { $set: { status: 'sent' } },
  )

  res.json({ success: true, data: { modifiedCount: result.modifiedCount ?? 0 } })
})

