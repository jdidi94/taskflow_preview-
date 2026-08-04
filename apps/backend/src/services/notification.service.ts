import type { Server } from 'socket.io'

import { UserPreferences } from '../models/UserPreferences.js'
import type { NotificationEntityType, NotificationPriority } from '../models/Notification.js'

type NotifyInput = {
  recipientId: string
  senderId?: string | null
  type: string
  title: string
  message: string
  priority?: NotificationPriority
  entityType?: NotificationEntityType
  entityId?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  /** Skip when recipient === sender (default true). */
  skipSelf?: boolean
  /** Preference category under notifications.inApp (optional). */
  prefCategory?:
    | 'taskAssigned'
    | 'taskCompleted'
    | 'taskOverdue'
    | 'commentAdded'
    | 'mentionReceived'
    | 'spaceUpdates'
}

type SendFn = (recipientId: string, data: Record<string, unknown>) => Promise<unknown>

let ioRef: Server | null = null

export function bindNotificationIo(io: Server) {
  ioRef = io
}

function getSend(): SendFn | null {
  const send = (ioRef as any)?.of?.('/notifications')?.sendNotification as SendFn | undefined
  return send ?? null
}

async function allowsInApp(userId: string, category?: NotifyInput['prefCategory']) {
  if (!category) return true
  try {
    const prefs = await UserPreferences.findOne({ user: userId }).lean()
    const flag = (prefs as any)?.notifications?.inApp?.[category]
    if (typeof flag === 'boolean') return flag
    return true
  } catch {
    return true
  }
}

export const notificationService = {
  async notify(input: NotifyInput) {
    const recipientId = String(input.recipientId)
    if (!recipientId) return null
    if (input.skipSelf !== false && input.senderId && String(input.senderId) === recipientId) {
      return null
    }
    if (!(await allowsInApp(recipientId, input.prefCategory))) return null

    const payload: Record<string, unknown> = {
      sender: input.senderId ?? null,
      type: input.type,
      title: input.title.slice(0, 200),
      message: input.message.slice(0, 500),
      priority: input.priority ?? 'medium',
      metadata: input.metadata ?? {},
      tags: input.tags ?? [],
    }
    if (input.entityType && input.entityId) {
      payload.relatedEntity = {
        entityType: input.entityType,
        entityId: input.entityId,
      }
    }

    const send = getSend()
    if (send) {
      return send(recipientId, payload)
    }

    // Fallback when sockets are not bound yet (e.g. tests): persist only.
    const { Notification } = await import('../models/Notification.js')
    return Notification.create({ ...payload, recipient: recipientId })
  },

  async notifyMany(recipientIds: string[], input: Omit<NotifyInput, 'recipientId'>) {
    const unique = [...new Set(recipientIds.map(String).filter(Boolean))]
    const results = []
    for (const recipientId of unique) {
      results.push(await this.notify({ ...input, recipientId }))
    }
    return results
  },

  inviteTypeFor(entity: 'workspace' | 'space' | 'board' | 'Workspace' | 'Space' | 'Board') {
    const key = entity.toLowerCase()
    if (key === 'space') return 'space_invitation'
    if (key === 'board') return 'board_invitation'
    return 'workspace_invitation'
  },

  entityTypeForInvite(entity: 'workspace' | 'space' | 'board' | 'Workspace' | 'Space' | 'Board') {
    const key = entity.toLowerCase()
    if (key === 'space') return 'space' as const
    if (key === 'board') return 'board' as const
    return 'workspace' as const
  },
}
