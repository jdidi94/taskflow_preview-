import { Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { BarChart3, CheckCircle2, ListTodo } from 'lucide-react'

import { ActivityHeatmapGrid } from '@/components/analytics/ActivityHeatmapGrid'
import { CompletionRateChart } from '@/components/analytics/CompletionRateChart'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useI18n } from '@/i18n'
import { useGetUserAnalyticsQuery } from '@/services/analyticsApi'

export function AnalyticsPanel() {
  const { t } = useI18n()
  const { data, isLoading, isError } = useGetUserAnalyticsQuery({ range: '3m' })
  const analytics = data?.data?.analytics

  const assigned = Number(analytics?.tasksAssigned ?? 0)
  const completed = Number(analytics?.tasksCompleted ?? 0)
  const rate = Number(analytics?.completionRate ?? 0)
  const heatmap = analytics?.activityHeatmap ?? []

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('analytics.title') },
          ]}
        />
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('analytics.title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('analytics.subtitle')}</p>
      </section>

      {isLoading ? <Loading label={t('common.loading')} /> : null}
      {isError ? <p className="text-sm text-destructive">{t('analytics.loadError')}</p> : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,16rem)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-1">
                  <CardTitle className="text-xs text-muted-foreground">{t('analytics.assigned')}</CardTitle>
                  <ListTodo className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{assigned}</p>
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardHeader className="flex flex-row items-center justify-between pb-1">
                  <CardTitle className="text-xs text-muted-foreground">{t('analytics.completed')}</CardTitle>
                  <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{completed}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/70">
              <CardContent className="flex items-center justify-center py-5">
                <CompletionRateChart
                  rate={rate}
                  completed={completed}
                  total={assigned}
                  size="md"
                />
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
                <CardTitle className="text-base">{t('analytics.activity')}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">{t('analytics.heatmapHint')}</p>
            </CardHeader>
            <CardContent>
              <ActivityHeatmapGrid points={heatmap} weeks={16} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
