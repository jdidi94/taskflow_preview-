import { Link } from 'react-router'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { ArrowUpRight } from 'lucide-react'

import { PageHeader } from '@/components/common/PageHeader'
import { useI18n } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'
import { useGetAnalyticsQuery } from '@/services/adminAnalyticsApi'

function formatUptime(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

export function OverviewPanel() {
  const { t } = useI18n()
  const { data, isLoading, isError, refetch } = useGetAnalyticsQuery()
  const analytics = data?.data

  if (isLoading) return <Loading label={t('common.loading')} />

  if (isError || !analytics) {
    return (
      <div className="space-y-3">
        <Alert variant="error" title={t('common.error')} description={t('dashboard.loadError')} />
        <Button variant="outline" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const cards = [
    { label: t('dashboard.totalUsers'), value: String(analytics.totalUsers), to: '/users' },
    { label: t('dashboard.activeUsers'), value: String(analytics.activeUsers.daily), to: '/users' },
    { label: t('dashboard.activeProjects'), value: String(analytics.activeProjects), to: '/analytics' },
    { label: t('dashboard.workspaces'), value: String(analytics.totalWorkspaces ?? '—'), to: '/analytics' },
    { label: t('dashboard.completionRate'), value: `${analytics.completionRate}%`, to: '/analytics' },
    {
      label: t('dashboard.uptime'),
      value: formatUptime(analytics.systemPerformance.serverUptime),
      to: '/system-health',
    },
  ]

  return (
    <div>
      <PageHeader title={t('dashboard.title')} subtitle={t('dashboard.clickHint')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className={`block rounded-xl ${focusRingClassName}`}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{card.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.openDetails')}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.tasksTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t('dashboard.taskPending')}: {analytics.taskCompletionData.pending}
            </Badge>
            <Badge variant="warning">
              {t('dashboard.taskProgress')}: {analytics.taskCompletionData.inProgress}
            </Badge>
            <Badge variant="success">
              {t('dashboard.taskDone')}: {analytics.taskCompletionData.completed}
            </Badge>
          </CardContent>
        </Card>
        <Link to="/system-health" className={`block rounded-xl ${focusRingClassName}`}>
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <CardTitle>{t('dashboard.dbHealth')}</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden />
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                {t('dashboard.dbHealth')}: {analytics.systemPerformance.databaseHealth}
              </p>
              <p>
                {t('dashboard.apiMs')}: {analytics.systemPerformance.apiResponseTime}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
