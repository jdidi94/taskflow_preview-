export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type AppNotification = {
  id: string
  _id?: string
  recipient?: string
  sender?: string | { _id?: string; name?: string; avatar?: string | null } | null
  type: string
  title: string
  message: string
  relatedEntity?: {
    entityType: string
    entityId: string
  } | null
  priority: NotificationPriority
  isRead: boolean
  readAt?: string | null
  isArchived?: boolean
  metadata?: Record<string, unknown>
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export type NotificationListData = {
  notifications: AppNotification[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    totalItems: number
    currentPage: number
    pages: number
  }
}

export type NotificationStats = {
  total: number
  unread: number
  byType: Record<string, number>
  byPriority: Record<string, number>
}

export function normalizeNotification(raw: AppNotification & Record<string, unknown>): AppNotification {
  const id = String(raw.id ?? raw._id ?? '')
  const related = raw.relatedEntity as { entityType?: string; entityId?: unknown } | null | undefined
  const meta = raw.metadata
  const metadata =
    meta instanceof Map
      ? Object.fromEntries(meta.entries())
      : meta && typeof meta === 'object'
        ? { ...(meta as Record<string, unknown>) }
        : {}

  return {
    ...raw,
    id,
    type: String(raw.type ?? 'info'),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    priority: (raw.priority as NotificationPriority) ?? 'medium',
    isRead: Boolean(raw.isRead),
    metadata,
    relatedEntity: related
      ? {
          entityType: String(related.entityType ?? ''),
          entityId: String(related.entityId ?? ''),
        }
      : null,
  }
}
