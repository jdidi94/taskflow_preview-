import type { AppNotification } from '@/types/notification'

/** Resolve a deep link for a notification card. */
export function notificationHref(notification: AppNotification): string {
  const entity = notification.relatedEntity
  const meta = notification.metadata ?? {}
  const type = notification.type

  if (type.includes('invitation') && !type.includes('accepted') && !type.includes('declined')) {
    const token = typeof meta.inviteUrl === 'string' ? meta.inviteUrl : null
    if (token?.includes('/invite/')) {
      const path = token.replace(/^https?:\/\/[^/]+/, '')
      if (path.startsWith('/')) return path
    }
  }

  if (!entity?.entityType || !entity.entityId) {
    if (typeof meta.boardId === 'string' && meta.boardId) {
      return `/boards/${meta.boardId}`
    }
    return '/notifications'
  }

  const { entityType, entityId } = entity

  if (entityType === 'workspace') return `/workspaces/${entityId}`
  if (entityType === 'space') return `/spaces/${entityId}`
  if (entityType === 'board') return `/boards/${entityId}`

  if (entityType === 'task') {
    const boardId = typeof meta.boardId === 'string' ? meta.boardId : null
    if (boardId) return `/boards/${boardId}?task=${entityId}`
    return '/notifications'
  }

  if (entityType === 'comment') {
    const boardId = typeof meta.boardId === 'string' ? meta.boardId : null
    const taskId = typeof meta.taskId === 'string' ? meta.taskId : entityId
    if (boardId) return `/boards/${boardId}?task=${taskId}`
  }

  return '/notifications'
}
