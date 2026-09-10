import { useState } from 'react'
import { Alert } from '@taskflow/ui'

import { ScopeAnalyticsView } from '@/components/analytics/ScopeAnalyticsView'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  buildScopeAnalyticsCsv,
  downloadTextFile,
} from '@/lib/analyticsExport'
import {
  useGetWorkspaceAnalyticsQuery,
  type AnalyticsPeriod,
} from '@/services/analyticsApi'

type Props = {
  workspaceId: string
}

export function WorkspaceAnalyticsPanel({ workspaceId }: Props) {
  const { t } = useI18n()
  const [period, setPeriod] = useState<AnalyticsPeriod>('month')
  const [exportError, setExportError] = useState<string | null>(null)

  const { data, isLoading, isError } = useGetWorkspaceAnalyticsQuery(
    { workspaceId, period },
    { skip: !workspaceId },
  )

  const analytics = data?.data?.analytics

  function onExportCsv() {
    if (!analytics) return
    setExportError(null)
    try {
      downloadTextFile(
        `workspace-analytics-${workspaceId}.csv`,
        buildScopeAnalyticsCsv(analytics),
        'text/csv;charset=utf-8',
      )
    } catch (err) {
      setExportError(
        getApiErrorMessage(err, t('analytics.exportError')),
      )
    }
  }

  function onExportJson() {
    if (!analytics) return
    setExportError(null)
    try {
      downloadTextFile(
        `workspace-analytics-${workspaceId}.json`,
        JSON.stringify({ analytics, period: data?.data?.period ?? period }, null, 2),
        'application/json;charset=utf-8',
      )
    } catch (err) {
      setExportError(
        getApiErrorMessage(err, t('analytics.exportError')),
      )
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {exportError ? <Alert variant="error" title={t('analytics.exportError')} description={exportError} /> : null}
      <ScopeAnalyticsView
        title={t('analytics.workspaceTitle')}
        subtitle={t('analytics.workspaceSubtitle')}
        analytics={analytics}
        period={period}
        onPeriodChange={setPeriod}
        isLoading={isLoading}
        isError={isError}
        onExportCsv={onExportCsv}
        onExportJson={onExportJson}
      />
    </div>
  )
}
