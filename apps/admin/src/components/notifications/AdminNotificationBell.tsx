import { Link } from 'react-router'
import { Bell } from 'lucide-react'

import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import { useGetAdminNotificationStatsQuery } from '@/services/adminActivityApi'

export function AdminNotificationBell() {
  const { t } = useI18n()
  const { data } = useGetAdminNotificationStatsQuery(undefined, { pollingInterval: 30_000 })
  const unread = data?.data.stats.unread ?? 0

  return (
    <Link
      to="/notifications"
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted/70 ${focusRingClassName}`}
      aria-label={t('activity.bellLabel', { count: unread })}
    >
      <Bell className="h-4 w-4" />
      {unread > 0 ? (
        <span className="absolute -top-0.5 -end-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[10px] font-semibold text-destructive-foreground">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  )
}
