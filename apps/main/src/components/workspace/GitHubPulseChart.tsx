import { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { useGetGitHubStatsPulseQuery } from '@/services/githubApi'

type Props = {
  workspaceId: string
  enabled: boolean
}

export function GitHubPulseChart({ workspaceId, enabled }: Props) {
  const { t } = useI18n()
  const [days, setDays] = useState<7 | 30>(7)
  const { data, isLoading, isError } = useGetGitHubStatsPulseQuery(
    { workspaceId, days },
    { skip: !enabled },
  )

  const pulse = data?.data?.pulse
  const series = pulse?.series ?? []
  const maxBar = Math.max(
    1,
    ...series.map((d) => d.commits + d.prsMerged + d.issuesClosed),
  )

  if (!enabled) return null

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{t('github.statsPulseTitle')}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('github.statsPulseHint')}</p>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={days === 7 ? 'primary' : 'outline'}
              onClick={() => setDays(7)}
            >
              {t('github.pulse7d')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={days === 30 ? 'primary' : 'outline'}
              onClick={() => setDays(30)}
            >
              {t('github.pulse30d')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? <Loading label={t('common.loading')} /> : null}
        {isError ? (
          <p className="text-sm text-muted-foreground">{t('github.statsLoadError')}</p>
        ) : null}
        {!isLoading && data?.data && !data.data.synced ? (
          <p className="text-sm text-muted-foreground">{t('github.statsNotSynced')}</p>
        ) : null}

        {!isLoading && pulse ? (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Metric label={t('github.pulseCommits')} value={pulse.commits} />
              <Metric label={t('github.pulsePrsMerged')} value={pulse.prsMerged} />
              <Metric label={t('github.pulseIssuesClosed')} value={pulse.issuesClosed} />
            </div>

            <div className="flex h-28 items-end gap-0.5 sm:gap-1" role="img" aria-label={t('github.statsPulseTitle')}>
              {series.map((day) => {
                const total = day.commits + day.prsMerged + day.issuesClosed
                const height = Math.max(4, Math.round((total / maxBar) * 100))
                return (
                  <div
                    key={day.date}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end"
                    title={`${day.date}: ${total}`}
                  >
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{series[0]?.date}</span>
              <span>{series[series.length - 1]?.date}</span>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
