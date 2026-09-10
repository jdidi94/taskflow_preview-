import { metaString, plainMeta, taskBoardHref } from '@/lib/taskHref'
import type { AppNotification } from '@/types/notification'

function firstTaskIdFromMeta(meta: Record<string, unknown>): string | null {
  const direct = metaString(meta, 'taskId', 'task')
  if (direct) return direct
  const tools = meta.tools
  if (!Array.isArray(tools)) return null
  for (const tool of tools) {
    if (!tool || typeof tool !== 'object') continue
    const id = (tool as { taskId?: unknown }).taskId
    if (id != null && String(id)) return String(id)
  }
  return null
}

/** Resolve a deep link for a notification card. */
export function notificationHref(notification: AppNotification): string {
  const entity = notification.relatedEntity
  const meta = plainMeta(notification.metadata)
  const type = notification.type
  const placeType = typeof meta.placeType === 'string' ? meta.placeType : null
  const boardId =
    metaString(meta, 'boardId', 'board') ??
    (entity?.entityType === 'board' ? entity.entityId : null) ??
    (placeType === 'board' ? metaString(meta, 'placeId') : null)
  const metaTaskId = firstTaskIdFromMeta(meta)

  if (type.includes('invitation') && !type.includes('accepted') && !type.includes('declined')) {
    const token = typeof meta.inviteUrl === 'string' ? meta.inviteUrl : null
    if (token?.includes('/invite/')) {
      const path = token.replace(/^https?:\/\/[^/]+/, '')
      if (path.startsWith('/')) return path
    }
  }

  if (boardId && metaTaskId) return taskBoardHref(boardId, metaTaskId)

  if (!entity?.entityType || !entity.entityId) {
    if (boardId) return `/boards/${boardId}`
    return '/notifications'
  }

  const { entityType, entityId } = entity

  if (entityType === 'workspace') return `/workspaces/${entityId}`
  if (entityType === 'space') return `/spaces/${entityId}`
  if (entityType === 'board') {
    if (metaTaskId) return taskBoardHref(entityId, metaTaskId)
    return `/boards/${entityId}`
  }

  if (entityType === 'task') {
    if (boardId) return taskBoardHref(boardId, entityId)
    return '/notifications'
  }

  if (entityType === 'comment') {
    const taskId = metaTaskId ?? entityId
    if (boardId && taskId) return taskBoardHref(boardId, taskId)
  }

  if (boardId) return `/boards/${boardId}`
  return '/notifications'
}
