import { useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { AnalyticsSeriesChart } from '@/components/analytics/AnalyticsSeriesChart'
import { AnalyticsTaskMix } from '@/components/analytics/AnalyticsTaskMix'
import { PageHeader } from '@/components/common/PageHeader'
import { useI18n, type MessageKey } from '@/i18n'
import { getAccessToken } from '@/lib/authToken'
import { useGetAnalyticsQuery } from '@/services/adminAnalyticsApi'
import {
  ADMIN_ANALYTICS_RANGES,
  isAdminAnalyticsTimeRange,
  type AdminAnalyticsTimeRange,
} from '@/types/analytics'

const RANGE_KEYS: Record<AdminAnalyticsTimeRange, MessageKey> = {
  '1-month': 'analytics.range1m',
  '3-months': 'analytics.range3m',
  '6-months': 'analytics.range6m',
  '1-year': 'analytics.range1y',
}

export function AnalyticsPanel() {
  const { t, locale } = useI18n()
  const [timeRange, setTimeRange] = useState<AdminAnalyticsTimeRange>('6-months')
  const { data, isLoading, isError, isFetching, refetch } = useGetAnalyticsQuery(timeRange)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const analytics = data?.data

  const userGrowth = useMemo(
    () =>
      (analytics?.userGrowthData ?? []).map((point) => ({
        id: point.date,
        label: formatSeriesLabel(point.date, analytics?.granularity, locale),
        value: point.signups,
      })),
    [analytics?.granularity, analytics?.userGrowthData, locale],
  )

  const projectTrends = useMemo(
    () =>
      (analytics?.projectCreationTrends ?? []).map((point) => ({
        id: point.date,
        label: formatSeriesLabel(point.date, analytics?.granularity, locale),
        value: point.projects,
      })),
    [analytics?.granularity, analytics?.projectCreationTrends, locale],
  )

  async function exportAnalytics(format: 'json' | 'csv') {
    setExporting(true)
    setExportError(null)
    try {
      const token = getAccessToken()
      const response = await fetch(`/api/admin/analytics/export?format=${format}&timeRange=${timeRange}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error(t('analytics.exportError'))
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `admin-analytics-${timeRange}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      setExportError(t('analytics.exportError'))
    } finally {
      setExporting(false)
    }
  }

  if (isLoading && !analytics) return <Loading label={t('common.loading')} />

  if (isError || !analytics) {
    return (
      <div className="space-y-3">
        <Alert variant="error" title={t('analytics.loadError')} />
        <Button variant="outline" onClick={() => void refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const latestSignups = analytics.userGrowthData?.at(-1)?.signups ?? 0

  return (
    <div>
      <PageHeader
        title={t('analytics.title')}
        subtitle={t('analytics.subtitle')}
        actions={
          <>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('analytics.range')}</span>
              <select
                className="h-9 rounded-md border border-border bg-background px-2"
                value={timeRange}
                disabled={isFetching}
                onChange={(event) => {
                  if (isAdminAnalyticsTimeRange(event.target.value)) setTimeRange(event.target.value)
                }}
                aria-label={t('analytics.range')}
              >
                {ADMIN_ANALYTICS_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {t(RANGE_KEYS[range])}
                  </option>
                ))}
              </select>
            </label>
            <Button variant="outline" disabled={exporting} onClick={() => void exportAnalytics('json')}>
              {exporting ? t('analytics.exporting') : t('analytics.exportJson')}
            </Button>
            <Button variant="outline" disabled={exporting} onClick={() => void exportAnalytics('csv')}>
              {exporting ? t('analytics.exporting') : t('analytics.exportCsv')}
            </Button>
          </>
        }
      />
      {exportError ? <Alert className="mb-4" variant="error" title={exportError} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric title={t('dashboard.totalUsers')} value={analytics.totalUsers} hint={t('analytics.newSignups', { count: latestSignups })} />
        <Metric title={t('analytics.daily')} value={analytics.activeUsers.daily} />
        <Metric title={t('analytics.weekly')} value={analytics.activeUsers.weekly} />
        <Metric title={t('analytics.monthly')} value={analytics.activeUsers.monthly} />
        <Metric title={t('dashboard.activeProjects')} value={analytics.activeProjects} />
        <Metric title={t('dashboard.completionRate')} value={`${analytics.completionRate}%`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t('analytics.userGrowth')}</CardTitle>
            <Badge variant="secondary">{t(RANGE_KEYS[timeRange])}</Badge>
          </CardHeader>
          <CardContent>
            <AnalyticsSeriesChart
              rows={userGrowth}
              emptyLabel={t('analytics.emptySeries')}
              chartLabel={t('analytics.userGrowth')}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t('analytics.projectTrends')}</CardTitle>
            <Badge variant="secondary">{t(RANGE_KEYS[timeRange])}</Badge>
          </CardHeader>
          <CardContent>
            <AnalyticsSeriesChart
              rows={projectTrends}
              emptyLabel={t('analytics.emptySeries')}
              barClassName="bg-accent"
              chartLabel={t('analytics.projectTrends')}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('analytics.taskOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnalyticsTaskMix
            pending={analytics.taskCompletionData.pending}
            inProgress={analytics.taskCompletionData.inProgress}
            completed={analytics.taskCompletionData.completed}
            pendingLabel={t('dashboard.taskPending')}
            progressLabel={t('dashboard.taskProgress')}
            doneLabel={t('dashboard.taskDone')}
            chartLabel={t('analytics.taskOverview')}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ title, value, hint }: { title: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}

function formatSeriesLabel(date: string, granularity: string | undefined, locale: string) {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  if (granularity === 'day') {
    return parsed.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }
  if (granularity === 'week') {
    return parsed.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }
  return parsed.toLocaleDateString(locale, { month: 'short', year: '2-digit' })
}
