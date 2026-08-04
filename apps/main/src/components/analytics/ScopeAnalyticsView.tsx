import type { ReactNode } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ListTodo,
  Users,
} from 'lucide-react'

import { ActivityHeatmapGrid } from '@/components/analytics/ActivityHeatmapGrid'
import { CompletionRateChart } from '@/components/analytics/CompletionRateChart'
import { useI18n } from '@/i18n'
import type { AnalyticsPeriod, ScopeAnalytics } from '@/services/analyticsApi'

const PERIODS: AnalyticsPeriod[] = ['week', 'month', 'quarter', 'year']

type Props = {
  title: string
  subtitle: string
  analytics: ScopeAnalytics | undefined
  period: AnalyticsPeriod
  onPeriodChange: (period: AnalyticsPeriod) => void
  isLoading: boolean
  isError: boolean
  exporting?: boolean
  onExportCsv?: () => void
  onExportJson?: () => void
  extra?: ReactNode
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: ReactNode
}) {
  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-center justify-between pb-1">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

export function ScopeAnalyticsView({
  title,
  subtitle,
  analytics,
  period,
  onPeriodChange,
  isLoading,
  isError,
  exporting,
  onExportCsv,
  onExportJson,
  extra,
}: Props) {
  const { t } = useI18n()

  const priority = analytics?.taskMetrics?.priorityDistribution
  const topPerformers = analytics?.teamMetrics?.topPerformers ?? []
  const workload = analytics?.teamMetrics?.workloadDistribution ?? []
  const daily = analytics?.timeSeries?.dailyActivity ?? []

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('analytics.period')}</span>
            <select
              className="tf-input"
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as AnalyticsPeriod)}
            >
              {PERIODS.map((value) => (
                <option key={value} value={value}>
                  {value === 'week'
                    ? t('analytics.periodWeek')
                    : value === 'month'
                      ? t('analytics.periodMonth')
                      : value === 'quarter'
                        ? t('analytics.periodQuarter')
                        : t('analytics.periodYear')}
                </option>
              ))}
            </select>
          </label>
          {onExportCsv ? (
            <Button type="button" variant="outline" size="sm" disabled={exporting || isLoading} onClick={onExportCsv}>
              {exporting ? t('analytics.exporting') : t('analytics.exportCsv')}
            </Button>
          ) : null}
          {onExportJson ? (
            <Button type="button" variant="outline" size="sm" disabled={exporting || isLoading} onClick={onExportJson}>
              {t('analytics.exportJson')}
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? <Loading label={t('common.loading')} /> : null}
      {isError ? <Alert variant="error" title={t('analytics.loadError')} /> : null}

      {!isLoading && !isError && analytics ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label={t('analytics.totalTasks')}
              value={analytics.totalTasks}
              icon={<ListTodo className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            />
            <MetricCard
              label={t('analytics.completed')}
              value={analytics.completedTasks}
              icon={<CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            />
            <MetricCard
              label={t('analytics.inProgress')}
              value={analytics.inProgressTasks}
              icon={<Clock3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            />
            <MetricCard
              label={t('analytics.overdue')}
              value={analytics.overdueTasks}
              icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            />
            <MetricCard
              label={t('analytics.members')}
              value={`${analytics.activeMembers}/${analytics.totalMembers}`}
              icon={<Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
            />
            <Card className="border-border/70 sm:col-span-2 lg:col-span-1">
              <CardContent className="flex items-center justify-center py-4">
                <CompletionRateChart
                  rate={Number(analytics.completionRate ?? 0)}
                  completed={analytics.completedTasks}
                  total={analytics.totalTasks}
                  size="sm"
                />
              </CardContent>
            </Card>
          </div>

          <p className="text-sm text-muted-foreground">
            {t('analytics.avgCompletion', {
              hours: Number(analytics.averageCompletionTime ?? 0).toFixed(1),
            })}
          </p>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.priority')}</CardTitle>
              </CardHeader>
              <CardContent>
                {priority ? (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {(
                      [
                        ['low', priority.low, 'analytics.priorityLow'] as const,
                        ['medium', priority.medium, 'analytics.priorityMedium'] as const,
                        ['high', priority.high, 'analytics.priorityHigh'] as const,
                        ['urgent', priority.urgent, 'analytics.priorityUrgent'] as const,
                      ]
                    ).map(([, count, labelKey]) => (
                      <li key={labelKey} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>{t(labelKey)}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('analytics.noBreakdown')}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.topPerformers')}</CardTitle>
              </CardHeader>
              <CardContent>
                {topPerformers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('analytics.noTeam')}</p>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {topPerformers.map((person) => (
                      <li
                        key={`${person.name}-${person.tasksCompleted}`}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="truncate">{person.name}</span>
                        <span className="text-muted-foreground">
                          {t('analytics.tasksCompletedCount', { count: person.tasksCompleted })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.workload')}</CardTitle>
              </CardHeader>
              <CardContent>
                {workload.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('analytics.noTeam')}</p>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {workload.slice(0, 8).map((row) => (
                      <li
                        key={`${row.member}-${row.tasks}`}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <span className="truncate">{row.member}</span>
                        <span className="text-muted-foreground">
                          {t('analytics.tasksAssignedCount', { count: row.tasks })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{t('analytics.dailyActivity')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('analytics.heatmapHint')}</p>
            </CardHeader>
            <CardContent>
              <ActivityHeatmapGrid
                points={daily.map((day) => ({ date: day.date, value: day.tasks }))}
                weeks={period === 'week' ? 4 : period === 'year' ? 26 : 16}
              />
            </CardContent>
          </Card>

          {extra}
        </>
      ) : null}
    </section>
  )
}
