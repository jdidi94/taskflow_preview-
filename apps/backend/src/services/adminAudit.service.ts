import type { AuthedRequest } from '../middlewares/auth.js'
import { Admin } from '../models/Admin.js'
import { AdminAuditLog, type AdminAuditTargetType } from '../models/AdminAuditLog.js'
import { AdminNotification, type AdminNotificationPriority } from '../models/AdminNotification.js'

export type RecordAdminAuditInput = {
  action: string
  targetType: AdminAuditTargetType
  targetId?: string | null
  targetLabel?: string | null
  summary: string
  metadata?: Record<string, unknown>
  notify?: boolean
  notifyTitle?: string
  notifyMessage?: string
  notifyType?: string
  notifyPriority?: AdminNotificationPriority
  href?: string | null
}

function clientIp(req?: AuthedRequest) {
  const forwarded = req?.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0]?.trim()
  return req?.ip ?? null
}

export function serializeAdminNotification(doc: unknown) {
  const plain = (doc ?? {}) as Record<string, unknown>
  return {
    id: String(plain.id ?? plain._id ?? ''),
    recipient: String(plain.recipient ?? ''),
    title: String(plain.title ?? ''),
    message: String(plain.message ?? ''),
    type: String(plain.type ?? ''),
    priority: String(plain.priority ?? 'medium'),
    isRead: Boolean(plain.isRead),
    readAt: plain.readAt ? new Date(plain.readAt as string).toISOString() : null,
    href: typeof plain.href === 'string' ? plain.href : null,
    auditLogId: plain.auditLogId ? String(plain.auditLogId) : null,
    metadata: plain.metadata && typeof plain.metadata === 'object' ? plain.metadata : {},
    createdAt: plain.createdAt ? new Date(plain.createdAt as string).toISOString() : new Date().toISOString(),
  }
}

export function serializeAdminAuditLog(doc: unknown) {
  const plain = (doc ?? {}) as Record<string, unknown>
  return {
    id: String(plain.id ?? plain._id ?? ''),
    actorId: String(plain.actorId ?? ''),
    actorName: String(plain.actorName ?? ''),
    actorEmail: typeof plain.actorEmail === 'string' ? plain.actorEmail : null,
    action: String(plain.action ?? ''),
    targetType: String(plain.targetType ?? 'system'),
    targetId: typeof plain.targetId === 'string' ? plain.targetId : null,
    targetLabel: typeof plain.targetLabel === 'string' ? plain.targetLabel : null,
    summary: String(plain.summary ?? ''),
    metadata: plain.metadata && typeof plain.metadata === 'object' ? plain.metadata : {},
    ip: typeof plain.ip === 'string' ? plain.ip : null,
    createdAt: plain.createdAt ? new Date(plain.createdAt as string).toISOString() : new Date().toISOString(),
  }
}

export async function notifyActiveAdmins(input: {
  title: string
  message: string
  type: string
  priority?: AdminNotificationPriority
  href?: string | null
  auditLogId?: string | null
  excludeRecipientId?: string | null
  metadata?: Record<string, unknown>
}) {
  const admins = await Admin.find({ isActive: true }).select('_id').lean()
  const docs = admins
    .filter((admin) => !input.excludeRecipientId || String(admin._id) !== input.excludeRecipientId)
    .map((admin) => ({
      recipient: admin._id,
      title: input.title,
      message: input.message,
      type: input.type,
      priority: input.priority ?? 'medium',
      href: input.href ?? null,
      auditLogId: input.auditLogId ?? null,
      metadata: input.metadata ?? {},
    }))
  if (docs.length === 0) return []
  return AdminNotification.insertMany(docs)
}

export async function recordAdminAudit(req: AuthedRequest | undefined, input: RecordAdminAuditInput) {
  try {
    const actorId = req?.user?.sub
    if (!actorId) return null

    const log = await AdminAuditLog.create({
      actorId,
      actorName: req.user?.name || req.user?.email || 'Admin',
      actorEmail: req.user?.email ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      targetLabel: input.targetLabel ?? null,
      summary: input.summary,
      metadata: input.metadata ?? {},
      ip: clientIp(req),
      userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
    })

    if (input.notify) {
      await notifyActiveAdmins({
        title: input.notifyTitle || input.summary,
        message: input.notifyMessage || input.summary,
        type: input.notifyType || input.action,
        priority: input.notifyPriority ?? 'medium',
        href: input.href ?? '/notifications',
        auditLogId: String(log._id),
        excludeRecipientId: actorId,
        metadata: { action: input.action, ...(input.metadata ?? {}) },
      })
    }

    return log
  } catch (error) {
    console.error('[admin-audit] failed to record action', error)
    return null
  }
}
