import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { Activity, CircleDot, GitPullRequest, FolderGit2 } from 'lucide-react'

import { useI18n } from '@/i18n'
import { useGetGitHubStatsOverviewQuery } from '@/services/githubApi'

type Props = {
  workspaceId: string
  enabled: boolean
}

export function GitHubOverviewCard({ workspaceId, enabled }: Props) {
  const { t } = useI18n()
  const { data, isLoading, isError } = useGetGitHubStatsOverviewQuery(workspaceId, {
    skip: !enabled,
  })

  const payload = data?.data
  const overview = payload?.overview

  if (!enabled) return null

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{t('github.statsOverviewTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('github.statsOverviewHint')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading label={t('common.loading')} /> : null}
        {isError ? (
          <p className="text-sm text-muted-foreground">{t('github.statsLoadError')}</p>
        ) : null}
        {!isLoading && payload && !payload.synced ? (
          <p className="text-sm text-muted-foreground">{t('github.statsNotSynced')}</p>
        ) : null}
        {!isLoading && overview ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon={<FolderGit2 className="h-4 w-4" aria-hidden />}
              label={t('github.statRepos')}
              value={overview.reposCount}
            />
            <Stat
              icon={<GitPullRequest className="h-4 w-4" aria-hidden />}
              label={t('github.statOpenPrs')}
              value={overview.openPrs}
            />
            <Stat
              icon={<CircleDot className="h-4 w-4" aria-hidden />}
              label={t('github.statOpenIssues')}
              value={overview.openIssues}
            />
            <Stat
              icon={<Activity className="h-4 w-4" aria-hidden />}
              label={t('github.statLastActivity')}
              value={
                overview.lastActivityAt
                  ? new Date(overview.lastActivityAt).toLocaleDateString()
                  : '—'
              }
            />
          </div>
        ) : null}
        {payload?.syncedAt ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t('github.lastSync', { date: new Date(payload.syncedAt).toLocaleString() })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
