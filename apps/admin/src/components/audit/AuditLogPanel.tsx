import { useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, Input, Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { useGetAdminAuditStatsQuery, useListAdminAuditLogsQuery } from '@/services/adminActivityApi'

export function AuditLogPanel() {
  const { t, locale } = useI18n()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const statsQuery = useGetAdminAuditStatsQuery()
  const logsQuery = useListAdminAuditLogsQuery({ page, limit: 20, q: search.trim() || undefined })
  const logs = logsQuery.data?.data.logs ?? []
  const pages = logsQuery.data?.data.pagination.pages ?? 1
  const stats = statsQuery.data?.data.stats

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label={t('activity.auditTotal')} value={stats?.total ?? 0} />
        <Stat label={t('activity.auditDay')} value={stats?.last24h ?? 0} />
        <Stat label={t('activity.auditTop')} value={topAction(stats?.byAction)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-sm"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder={t('activity.auditSearch')}
        />
        <Button size="sm" variant="outline" onClick={() => void logsQuery.refetch()}>
          {t('common.refresh')}
        </Button>
      </div>

      {logsQuery.isError ? <Alert variant="error" title={t('activity.loadAuditError')} /> : null}
      {logsQuery.isLoading ? <Loading label={t('common.loading')} /> : null}
      {!logsQuery.isLoading && logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('activity.emptyAudit')}</p>
      ) : null}

      <div className="space-y-3">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardContent className="space-y-2 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{log.summary}</p>
                <Badge variant="outline">{log.action}</Badge>
                <Badge variant="secondary">{log.targetType}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {log.actorName}
                {log.actorEmail ? ` · ${log.actorEmail}` : ''}
                {log.targetLabel ? ` · ${log.targetLabel}` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleString(locale)}
                {log.ip ? ` · ${log.ip}` : ''}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            {t('common.prev')}
          </Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
            {t('common.next')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function topAction(byAction?: Record<string, number>) {
  if (!byAction) return '—'
  const [action] = Object.entries(byAction).sort((a, b) => b[1] - a[1])[0] ?? []
  return action || '—'
}
