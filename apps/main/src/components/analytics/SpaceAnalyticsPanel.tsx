import { useState } from 'react'
import { Alert, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { ScopeAnalyticsView } from '@/components/analytics/ScopeAnalyticsView'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { downloadSpaceAnalyticsCsv, downloadTextFile } from '@/lib/analyticsExport'
import {
  useGetSpaceAnalyticsQuery,
  useGetTeamPerformanceQuery,
  type AnalyticsPeriod,
} from '@/services/analyticsApi'

type Props = {
  spaceId: string
}

export function SpaceAnalyticsPanel({ spaceId }: Props) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data, isLoading, isError } = useGetSpaceAnalyticsQuery(
    { spaceId, period },
    { skip: !spaceId },
  )
  const {
    data: teamData,
    isLoading: teamLoading,
    isError: teamError,
  } = useGetTeamPerformanceQuery({ spaceId, period }, { skip: !spaceId })

  const analytics = data?.data?.analytics
  const team = teamData?.data?.analytics

  async function onExportCsv() {
    setExportError(null)
    setExporting(true)
    try {
      await downloadSpaceAnalyticsCsv(spaceId, period)
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : getApiErrorMessage(err, t('analytics.exportError')),
      )
    } finally {
      setExporting(false)
    }
  }

  function onExportJson() {
    if (!analytics) return
    setExportError(null)
    try {
      downloadTextFile(
        `space-analytics-${spaceId}.json`,
        JSON.stringify(
          {
            analytics,
            period: data?.data?.period ?? period,
            teamPerformance: team ?? null,
          },
          null,
          2,
        ),
        'application/json;charset=utf-8',
      )
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : getApiErrorMessage(err, t('analytics.exportError')),
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {exportError ? <Alert variant="error" title={t('analytics.exportError')} description={exportError} /> : null}
      <ScopeAnalyticsView
        title={t('analytics.spaceTitle')}
        subtitle={t('analytics.spaceSubtitle')}
        analytics={analytics}
        period={period}
        onPeriodChange={setPeriod}
        isLoading={isLoading}
        isError={isError}
        exporting={exporting}
        onExportCsv={() => void onExportCsv()}
        onExportJson={onExportJson}
        extra={
          !teamLoading && !teamError && team ? (
            <Card className="border-border/70">
              <CardHeader>
                <CardTitle className="text-base">{t('analytics.teamPerformance')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t('analytics.teamVelocity')}</p>
                  <p className="text-xl font-semibold">
                    {Number(team.teamVelocity ?? 0).toFixed(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('analytics.collaboration')}</p>
                  <p className="text-xl font-semibold">
                    {Number(team.collaborationScore ?? 0).toFixed(0)}%
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null
        }
      />
    </div>
  )
}
