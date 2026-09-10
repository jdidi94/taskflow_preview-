import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { ArrowDownUp, ExternalLink } from 'lucide-react'

import { useI18n } from '@/i18n'
import { useGetGitHubStatsReposQuery, type GitHubStatsRepoRow } from '@/services/githubApi'

type SortKey = 'pushedAt' | 'openPrs' | 'openIssues' | 'name'

type Props = {
  workspaceId: string
  enabled: boolean
}

export function GitHubReposTable({ workspaceId, enabled }: Props) {
  const { t } = useI18n()
  const { data, isLoading, isError } = useGetGitHubStatsReposQuery(workspaceId, {
    skip: !enabled,
  })
  const [sortKey, setSortKey] = useState<SortKey>('pushedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const rows = useMemo(() => {
    const list = [...(data?.data?.repositories ?? [])]
    list.sort((a, b) => compareRepos(a, b, sortKey, sortDir))
    return list
  }, [data?.data?.repositories, sortDir, sortKey])

  if (!enabled) return null

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'name' ? 'asc' : 'desc')
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base">{t('github.statsReposTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('github.statsReposHint')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading label={t('common.loading')} /> : null}
        {isError ? (
          <p className="text-sm text-muted-foreground">{t('github.statsLoadError')}</p>
        ) : null}
        {!isLoading && data?.data && !data.data.synced ? (
          <p className="text-sm text-muted-foreground">{t('github.statsNotSynced')}</p>
        ) : null}
        {!isLoading && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border/60">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <Th label={t('github.colRepo')} onClick={() => toggleSort('name')} />
                  <Th label={t('github.colOpenPrs')} onClick={() => toggleSort('openPrs')} />
                  <Th label={t('github.colOpenIssues')} onClick={() => toggleSort('openIssues')} />
                  <Th label={t('github.colLanguage')} />
                  <Th label={t('github.colLastPush')} onClick={() => toggleSort('pushedAt')} />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.map((repo) => (
                  <tr key={repo.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        {repo.name}
                        <ExternalLink className="h-3 w-3 opacity-70" aria-hidden />
                      </a>
                      <p className="text-xs text-muted-foreground">{repo.fullName}</p>
                    </td>
                    <td className="px-3 py-2 tabular-nums">{repo.openPrs}</td>
                    <td className="px-3 py-2 tabular-nums">{repo.openIssues}</td>
                    <td className="px-3 py-2 text-muted-foreground">{repo.language ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {repo.pushedAt ? new Date(repo.pushedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {!isLoading && data?.data?.synced && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('github.reposEmpty')}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Th({ label, onClick }: { label: string; onClick?: () => void }) {
  if (!onClick) {
    return <th className="px-3 py-2 font-medium">{label}</th>
  }
  return (
    <th className="px-3 py-2 font-medium">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground"
        onClick={onClick}
      >
        {label}
        <ArrowDownUp className="h-3 w-3" aria-hidden />
      </button>
    </th>
  )
}

function compareRepos(
  a: GitHubStatsRepoRow,
  b: GitHubStatsRepoRow,
  key: SortKey,
  dir: 'asc' | 'desc',
) {
  const mul = dir === 'asc' ? 1 : -1
  if (key === 'name') return a.name.localeCompare(b.name) * mul
  if (key === 'openPrs') return (a.openPrs - b.openPrs) * mul
  if (key === 'openIssues') return (a.openIssues - b.openIssues) * mul
  const at = a.pushedAt ? new Date(a.pushedAt).getTime() : 0
  const bt = b.pushedAt ? new Date(b.pushedAt).getTime() : 0
  return (at - bt) * mul
}
