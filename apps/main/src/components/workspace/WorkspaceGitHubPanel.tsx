import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { Github, Link2, RefreshCw, Unlink } from 'lucide-react'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  buildGitHubAuthorizeUrl,
  getGitHubLinkRedirectUri,
  useForceGitHubReauthMutation,
  useGetGitHubStatusQuery,
  useLazyListGitHubOrgsQuery,
  useLinkGitHubMutation,
  useListGitHubReposQuery,
  useSyncGitHubMutation,
  useUnlinkGitHubMutation,
  type GitHubOrg,
} from '@/services/githubApi'
import { useUpdateWorkspaceMutation } from '@/services/workspacesApi'
import type { Workspace } from '@/types/domain'

type Props = {
  workspace: Workspace
  canManage: boolean
}

export function WorkspaceGitHubPanel({ workspace, canManage }: Props) {
  const { t } = useI18n()
  const { data: statusData, isLoading: statusLoading, isError: statusError, refetch } =
    useGetGitHubStatusQuery()
  const [linkGitHub] = useLinkGitHubMutation()
  const [syncGitHub, { isLoading: syncing }] = useSyncGitHubMutation()
  const [unlinkGitHub, { isLoading: unlinking }] = useUnlinkGitHubMutation()
  const [forceReauth, { isLoading: resetting }] = useForceGitHubReauthMutation()
  const [fetchOrgs, { data: orgsData, isFetching: orgsLoading }] = useLazyListGitHubOrgsQuery()
  const [updateWorkspace, { isLoading: savingOrg }] = useUpdateWorkspaceMutation()

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showRepos, setShowRepos] = useState(false)

  const status = statusData?.data
  const linked = Boolean(status?.linked)
  const linkedOrg = workspace.githubOrg?.login
  const organizations = orgsData?.data ?? []

  const { data: reposData, isFetching: reposLoading } = useListGitHubReposQuery(linkedOrg ?? '', {
    skip: !linked || !linkedOrg || !showRepos,
  })

  useEffect(() => {
    if (linked) void fetchOrgs()
  }, [linked, fetchOrgs])

  const connectWithPopup = useCallback(async () => {
    setError(null)
    setBusy(true)
    try {
      const state = `gh-link-${crypto.randomUUID()}`
      const url = buildGitHubAuthorizeUrl(state)
      const popup = window.open(url, 'github-link-oauth', 'width=600,height=720,scrollbars=yes,resizable=yes')
      if (!popup) {
        throw new Error(t('github.popupBlocked'))
      }

      await new Promise<void>((resolve, reject) => {
        const onMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return
          if (event.data?.type === 'GITHUB_LINK_OAUTH_SUCCESS') {
            window.removeEventListener('message', onMessage)
            clearInterval(closedTimer)
            try {
              await linkGitHub({
                code: String(event.data.code),
                redirectUri: getGitHubLinkRedirectUri(),
              }).unwrap()
              await refetch()
              await fetchOrgs()
              resolve()
            } catch (err) {
              reject(err)
            }
          }
          if (event.data?.type === 'GITHUB_LINK_OAUTH_ERROR') {
            window.removeEventListener('message', onMessage)
            clearInterval(closedTimer)
            reject(new Error(String(event.data.error || t('github.linkError'))))
          }
        }

        window.addEventListener('message', onMessage)
        const closedTimer = window.setInterval(() => {
          if (popup.closed) {
            clearInterval(closedTimer)
            window.removeEventListener('message', onMessage)
            reject(new Error(t('github.oauthCancelled')))
          }
        }, 800)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(err, t('github.linkError')))
    } finally {
      setBusy(false)
    }
  }, [fetchOrgs, linkGitHub, refetch, t])

  async function onSync() {
    setError(null)
    try {
      await syncGitHub().unwrap()
      await refetch()
    } catch (err) {
      setError(getApiErrorMessage(err, t('github.syncError')))
    }
  }

  async function onUnlinkAccount() {
    setError(null)
    try {
      if (workspace.githubOrg) {
        await updateWorkspace({ id: workspace.id, githubOrg: null }).unwrap()
      }
      await unlinkGitHub().unwrap()
      setShowRepos(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('github.unlinkError')))
    }
  }

  async function onForceReauth() {
    setError(null)
    try {
      await forceReauth().unwrap()
      await connectWithPopup()
    } catch (err) {
      setError(getApiErrorMessage(err, t('github.reauthError')))
    }
  }

  async function linkOrg(org: GitHubOrg) {
    if (!canManage) return
    setError(null)
    try {
      await updateWorkspace({
        id: workspace.id,
        githubOrg: {
          id: org.id,
          login: org.login,
          name: org.name,
          url: org.htmlUrl ?? org.url ?? null,
          avatar: org.avatar ?? null,
          description: org.description ?? null,
          linkedAt: new Date().toISOString(),
        },
      }).unwrap()
      setShowRepos(true)
    } catch (err) {
      setError(getApiErrorMessage(err, t('github.orgLinkError')))
    }
  }

  async function unlinkOrg() {
    if (!canManage) return
    setError(null)
    try {
      await updateWorkspace({ id: workspace.id, githubOrg: null }).unwrap()
      setShowRepos(false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('github.orgUnlinkError')))
    }
  }

  const actionBusy = busy || syncing || unlinking || resetting || savingOrg

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex items-start gap-2">
          <Github className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <div>
            <CardTitle className="text-base">{t('github.title')}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t('github.subtitle')}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {statusLoading ? <Loading label={t('common.loading')} /> : null}
        {statusError ? <Alert variant="error" title={t('github.statusError')} /> : null}
        {error ? <Alert variant="error" title={t('github.errorTitle')} description={error} /> : null}

        {!statusLoading && status ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={linked ? 'success' : 'outline'}>
                {linked ? t('github.linked') : t('github.notLinked')}
              </Badge>
              {linked && status.hasRequiredScopes === false ? (
                <Badge variant="warning">{t('github.missingScopes')}</Badge>
              ) : null}
              {linkedOrg ? (
                <Badge variant="secondary">
                  {t('github.workspaceOrg', { org: linkedOrg })}
                </Badge>
              ) : null}
            </div>

            {linked && status.github ? (
              <div className="rounded-lg border border-border/60 px-3 py-2 text-sm">
                <p className="font-medium">{status.github.username}</p>
                {status.github.email ? (
                  <p className="text-xs text-muted-foreground">{status.github.email}</p>
                ) : null}
                {status.github.lastSync ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('github.lastSync', {
                      date: new Date(status.github.lastSync).toLocaleString(),
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {!linked ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="gap-1.5"
                  disabled={actionBusy || !canManage}
                  onClick={() => void connectWithPopup()}
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden />
                  {busy ? t('github.connecting') : t('github.connect')}
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={actionBusy}
                    onClick={() => void onSync()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                    {syncing ? t('github.syncing') : t('github.sync')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionBusy || !canManage}
                    onClick={() => void onForceReauth()}
                  >
                    {t('github.reauth')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-destructive"
                    disabled={actionBusy || !canManage}
                    onClick={() => void onUnlinkAccount()}
                  >
                    <Unlink className="h-3.5 w-3.5" aria-hidden />
                    {t('github.unlink')}
                  </Button>
                </>
              )}
            </div>

            {!canManage ? (
              <p className="text-xs text-muted-foreground">{t('wsSettings.readOnlyHint')}</p>
            ) : null}

            {linked ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{t('github.orgsTitle')}</p>
                  {orgsLoading ? <span className="text-xs text-muted-foreground">{t('common.loading')}</span> : null}
                </div>

                {organizations.length === 0 && !orgsLoading ? (
                  <p className="text-sm text-muted-foreground">{t('github.orgsEmpty')}</p>
                ) : (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
                    {organizations.map((org) => {
                      const isWorkspaceOrg = linkedOrg === org.login
                      return (
                        <li
                          key={org.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{org.name || org.login}</p>
                            <p className="text-xs text-muted-foreground">@{org.login}</p>
                          </div>
                          {canManage ? (
                            isWorkspaceOrg ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={actionBusy}
                                onClick={() => void unlinkOrg()}
                              >
                                {t('github.unlinkOrg')}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={actionBusy}
                                onClick={() => void linkOrg(org)}
                              >
                                {t('github.linkOrg')}
                              </Button>
                            )
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {linkedOrg ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="self-start"
                      onClick={() => setShowRepos((value) => !value)}
                    >
                      {showRepos ? t('github.hideRepos') : t('github.showRepos')}
                    </Button>
                    {showRepos ? (
                      reposLoading ? (
                        <Loading label={t('common.loading')} />
                      ) : (
                        <ul className="max-h-56 overflow-auto divide-y divide-border/60 rounded-lg border border-border/60 text-sm">
                          {(reposData?.data?.repositories ?? []).slice(0, 20).map((repo) => (
                            <li key={repo.id} className="px-3 py-2">
                              <a
                                href={repo.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-primary hover:underline"
                              >
                                {repo.fullName}
                              </a>
                              {repo.description ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">{repo.description}</p>
                              ) : null}
                            </li>
                          ))}
                          {(reposData?.data?.repositories ?? []).length === 0 ? (
                            <li className="px-3 py-2 text-muted-foreground">{t('github.reposEmpty')}</li>
                          ) : null}
                        </ul>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
