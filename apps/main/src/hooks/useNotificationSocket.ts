import { useEffect } from 'react'

import { getNotificationSocket } from '@/lib/socket'
import { notificationsApi } from '@/services/notificationsApi'
import { useAppDispatch } from '@/store/hooks'
import { normalizeNotification, type AppNotification } from '@/types/notification'

export function useNotificationSocket(enabled: boolean) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!enabled) return

    let active = true
    const socket = getNotificationSocket()

    const onUnread = (payload: { count?: number }) => {
      if (!active || typeof payload.count !== 'number') return
      dispatch(
        notificationsApi.util.updateQueryData('getNotificationStats', undefined, (draft) => {
          if (!draft.data?.stats) return
          draft.data.stats.unread = payload.count
        }),
      )
    }

    const onNew = (payload: { notification?: AppNotification & Record<string, unknown> }) => {
      if (!active || !payload.notification) return
      const notification = normalizeNotification(payload.notification)

      dispatch(
        notificationsApi.util.updateQueryData('listNotifications', undefined, (draft) => {
          if (!draft.data) return
          const exists = draft.data.notifications.some((item) => item.id === notification.id)
          if (!exists) {
            draft.data.notifications = [notification, ...draft.data.notifications]
          }
          if (!notification.isRead) {
            draft.data.unreadCount += 1
          }
        }),
      )

      dispatch(
        notificationsApi.util.updateQueryData('listNotifications', { isRead: 'false' }, (draft) => {
          if (!draft.data || notification.isRead) return
          const exists = draft.data.notifications.some((item) => item.id === notification.id)
          if (!exists) {
            draft.data.notifications = [notification, ...draft.data.notifications]
          }
          draft.data.unreadCount += 1
        }),
      )

      dispatch(
        notificationsApi.util.updateQueryData('getNotificationStats', undefined, (draft) => {
          if (!draft.data?.stats) return
          draft.data.stats.total += 1
          if (!notification.isRead) draft.data.stats.unread += 1
        }),
      )
    }

    const requestUnread = () => {
      socket.emit('notifications:getUnreadCount')
    }

    if (socket.connected) requestUnread()
    socket.on('connect', requestUnread)
    socket.on('notifications:unreadCount', onUnread)
    socket.on('notification:new', onNew)

    return () => {
      active = false
      socket.off('connect', requestUnread)
      socket.off('notifications:unreadCount', onUnread)
      socket.off('notification:new', onNew)
    }
  }, [dispatch, enabled])
}
