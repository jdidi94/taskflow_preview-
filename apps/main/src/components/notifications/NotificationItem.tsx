import { useNavigate } from 'react-router'
import { Badge, Button, Card, CardContent } from '@taskflow/ui'

import { NotificationIcon } from '@/components/notifications/NotificationIcon'
import { useI18n } from '@/i18n'
import { notificationHref } from '@/lib/notificationHref'
import type { AppNotification } from '@/types/notification'

type Props = {
  notification: AppNotification
  busy?: boolean
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

function formatWhen(value: string | undefined, locale: string) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString(locale)
  } catch {
    return value
  }
}

export function NotificationItem({ notification, busy, onMarkRead, onDelete }: Props) {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const href = notificationHref(notification)

  async function openTarget() {
    if (!notification.isRead) onMarkRead(notification.id)
    navigate(href)
  }

  return (
    <Card
      className={`border-border/70 ${notification.isRead ? 'opacity-80' : 'border-primary/30 bg-primary/5'}`}
    >
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 rounded-md text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => void openTarget()}
        >
          <NotificationIcon type={notification.type} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{notification.title}</h2>
              {!notification.isRead ? (
                <Badge variant="secondary">{t('notifications.unreadBadge')}</Badge>
              ) : null}
              <Badge variant="outline">{notification.priority}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatWhen(notification.createdAt, locale)}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 flex-wrap gap-2 sm:ps-2">
          {!notification.isRead ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation()
                onMarkRead(notification.id)
              }}
            >
              {t('notifications.markRead')}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(notification.id)
            }}
          >
            {t('common.delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
