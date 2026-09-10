export type AdminNotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type AdminInboxNotification = {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  readAt: string | null
  href: string | null
  createdAt: string
}

export type AdminAuditLog = {
  id: string
  actorId: string
  actorName: string
  actorEmail: string | null
  action: string
  targetType: string
  targetId: string | null
  targetLabel: string | null
  summary: string
  metadata: Record<string, unknown>
  ip: string | null
  createdAt: string
}

export type AdminNotificationStats = {
  total: number
  unread: number
}

export type AdminAuditStats = {
  total: number
  last24h: number
  byAction: Record<string, number>
}
