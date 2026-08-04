import { Link } from 'react-router'
import { Badge, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { Activity } from 'lucide-react'

import { useI18n } from '@/i18n'
import { notificationHref } from '@/lib/notificationHref'
import { useListNotificationsQuery } from '@/services/notificationsApi'

function relativeTime(value: string | undefined, t: ReturnType<typeof useI18n>['t']) {
  if (!value) return '—'
  try {
    const diffMs = Date.now() - new Date(value).getTime()
    const minutes = Math.floor(diffMs / (1000 * 60))
    if (minutes < 1) return t('dashboard.activityJustNow')
    if (minutes < 60) return t('dashboard.activityMinutesAgo', { n: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('dashboard.activityHoursAgo', { n: hours })
    const days = Math.floor(hours / 24)
    return t('dashboard.activityDaysAgo', { n: days })
  } catch {
    return '—'
  }
}

export function RecentActivityWidget() {
  const { t } = useI18n()
  const { data, isLoading, isError } = useListNotificationsQuery({ page: 1, limit: 8 })
  const notifications = data?.data?.notifications ?? []

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" aria-hidden />
            <CardTitle className="text-base">{t('dashboard.activityTitle')}</CardTitle>
          </div>
          <Link to="/notifications" className="text-xs font-medium text-primary">
            {t('dashboard.activityViewAll')}
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">{t('dashboard.activitySubtitle')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading label={t('common.loading')} /> : null}
        {isError ? <p className="text-sm text-destructive">{t('dashboard.activityError')}</p> : null}
        {!isLoading && !isError && notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.activityEmpty')}</p>
        ) : null}
        {!isLoading && !isError && notifications.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {notifications.map((item) => (
              <li key={item.id}>
                <Link
                  to={notificationHref(item)}
                  className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {!item.isRead ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {t('dashboard.activityUnread')}
                      </Badge>
                    ) : null}
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(item.createdAt, t)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
