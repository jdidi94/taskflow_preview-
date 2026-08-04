import { useState } from 'react'
import { Alert, Badge, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useEndSessionMutation, useGetSessionsQuery, type AuthSession } from '@/services/authApi'

function formatRelative(value: string, t: ReturnType<typeof useI18n>['t']) {
  try {
    const date = new Date(value)
    const diffMs = Date.now() - date.getTime()
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    if (hours < 1) return t('settings.sessionsJustNow')
    if (hours < 24) return t('settings.sessionsHoursAgo', { n: hours })
    const days = Math.floor(hours / 24)
    return t('settings.sessionsDaysAgo', { n: days })
  } catch {
    return '—'
  }
}

function deviceLabel(session: AuthSession) {
  const parts = [session.deviceInfo.os, session.deviceInfo.browser].filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')
  return session.deviceInfo.type
}

export function SessionsSettings() {
  const { t } = useI18n()
  const { data, isLoading, isError } = useGetSessionsQuery()
  const [endSession, { isLoading: ending }] = useEndSessionMutation()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const sessions = data?.data ?? []
  const otherSessions = sessions.filter((session) => !session.isCurrent)

  async function revoke(sessionId: string) {
    setError(null)
    setStatus(null)
    setPendingId(sessionId)
    try {
      await endSession({ sessionId }).unwrap()
      setStatus(t('settings.sessionsRevoked'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.sessionsRevokeError')))
    } finally {
      setPendingId(null)
    }
  }

  async function revokeOthers() {
    setError(null)
    setStatus(null)
    setPendingId('all')
    try {
      await Promise.all(otherSessions.map((session) => endSession({ sessionId: session.sessionId }).unwrap()))
      setStatus(t('settings.sessionsRevokedOthers'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.sessionsRevokeError')))
    } finally {
      setPendingId(null)
    }
  }

  if (isLoading) return <Loading label={t('common.loading')} />

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.sessions')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('settings.sessionsSubtitle')}</p>

        {isError ? (
          <Alert variant="error" title={t('settings.saveError')} description={t('settings.sessionsLoadError')} />
        ) : null}
        {error ? <Alert variant="error" title={t('settings.saveError')} description={error} /> : null}
        {status ? <Alert variant="success" title={status} /> : null}

        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.sessionsEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sessions.map((session) => (
              <li
                key={session.sessionId}
                className="flex flex-col gap-3 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{deviceLabel(session)}</p>
                    {session.isCurrent ? (
                      <Badge variant="outline">{t('settings.sessionsCurrent')}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatRelative(session.lastActivityAt, t)}
                    {session.ipAddress ? ` · ${session.ipAddress}` : ''}
                  </p>
                </div>
                {!session.isCurrent ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={ending}
                    onClick={() => void revoke(session.sessionId)}
                  >
                    {pendingId === session.sessionId
                      ? t('settings.sessionsRevoking')
                      : t('settings.sessionsRevoke')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {otherSessions.length > 0 ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="self-start"
            disabled={ending}
            onClick={() => void revokeOthers()}
          >
            {pendingId === 'all' ? t('settings.sessionsRevoking') : t('settings.sessionsRevokeOthers')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
