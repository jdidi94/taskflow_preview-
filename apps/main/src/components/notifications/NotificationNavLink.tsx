import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Badge, Button } from '@taskflow/ui'
import { Bell } from 'lucide-react'

import { NotificationIcon } from '@/components/notifications/NotificationIcon'
import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import { notificationHref } from '@/lib/notificationHref'
import {
  useListNotificationsQuery,
  useMarkAsReadMutation,
} from '@/services/notificationsApi'

type Props = {
  unread: number
}

export function NotificationNavLink({ unread }: Props) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useListNotificationsQuery(
    { page: 1, limit: 6 },
    { skip: !open },
  )
  const [markAsRead] = useMarkAsReadMutation()
  const items = data?.data.notifications ?? []

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function openNotification(id: string, isRead: boolean, href: string) {
    setOpen(false)
    if (!isRead) {
      try {
        await markAsRead({ id }).unwrap()
      } catch {
        // still navigate
      }
    }
    navigate(href)
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={`relative inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground ${focusRingClassName}`}
        aria-label={t('common.notifications')}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="relative inline-flex">
          <Bell className="size-5" aria-hidden />
          {unread > 0 ? (
            <Badge
              variant="error"
              className="absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center px-1 text-[10px]"
            >
              {unread > 99 ? '99+' : unread}
            </Badge>
          ) : null}
        </span>
        <span className="hidden sm:inline">{t('common.notifications')}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t('notifications.previewTitle')}
          className="absolute end-0 z-50 mt-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-lg border border-border/70 bg-background shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
            <p className="text-sm font-medium">{t('notifications.previewTitle')}</p>
            {unread > 0 ? (
              <Badge variant="secondary" className="text-[10px]">
                {t('notifications.previewUnread', { count: unread })}
              </Badge>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {t('notifications.loading')}
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {t('notifications.empty')}
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {items.map((item) => {
                  const href = notificationHref(item)
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`flex w-full gap-2 px-3 py-2.5 text-start transition-colors hover:bg-muted/50 ${
                          item.isRead ? '' : 'bg-primary/5'
                        }`}
                        onClick={() => void openNotification(item.id, item.isRead, href)}
                      >
                        <NotificationIcon type={item.type} className="mt-0.5" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {item.message}
                          </span>
                          {item.createdAt ? (
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString(locale)}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="border-t border-border/60 p-2">
            <Link to="/notifications" onClick={() => setOpen(false)} className="block">
              <Button type="button" variant="outline" size="sm" className="w-full">
                {t('notifications.seeAll')}
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
