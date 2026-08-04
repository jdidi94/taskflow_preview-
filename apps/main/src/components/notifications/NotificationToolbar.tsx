import { Button } from '@taskflow/ui'

import { useI18n } from '@/i18n'

type Props = {
  unreadCount: number
  markingAll?: boolean
  clearing?: boolean
  onMarkAllRead: () => void
  onClearRead: () => void
}

export function NotificationToolbar({
  unreadCount,
  markingAll,
  clearing,
  onMarkAllRead,
  onClearRead,
}: Props) {
  const { t } = useI18n()

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('notifications.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {t('notifications.subtitle', { count: unreadCount })}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={markingAll || unreadCount === 0}
          onClick={onMarkAllRead}
        >
          {t('notifications.markAllRead')}
        </Button>
        <Button variant="ghost" size="sm" disabled={clearing} onClick={onClearRead}>
          {t('notifications.clearRead')}
        </Button>
      </div>
    </div>
  )
}
