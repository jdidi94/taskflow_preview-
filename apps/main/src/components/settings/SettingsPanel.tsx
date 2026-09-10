import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Loading } from '@taskflow/ui'

import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { ChangePasswordSettings } from '@/components/settings/ChangePasswordSettings'
import { SessionsSettings } from '@/components/settings/SessionsSettings'
import { TwoFactorSettings } from '@/components/settings/TwoFactorSettings'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useMeQuery,
  useUpdatePreferencesMutation,
  useUpdateProfileMutation,
} from '@/services/authApi'
import { useAppDispatch } from '@/store/hooks'
import { setUser } from '@/store/slices/authSlice'
import type { PublicUser } from '@/types/auth'

function toPublicUser(data: Record<string, unknown>): PublicUser {
  return {
    id: String(data.id ?? data._id ?? ''),
    email: String(data.email ?? ''),
    name: String(data.name ?? ''),
    avatar: (data.avatar as string | null) ?? null,
    isActive: Boolean(data.isActive ?? true),
    emailVerified: Boolean(data.emailVerified ?? false),
    lastLogin: (data.lastLogin as string | null) ?? null,
  }
}

export function SettingsPanel() {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { data, isLoading, isError } = useMeQuery()
  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation()
  const [updatePreferences, { isLoading: savingPrefs }] = useUpdatePreferencesMutation()

  const [name, setName] = useState('')
  const [emailNotif, setEmailNotif] = useState(true)
  const [realtimeNotif, setRealtimeNotif] = useState(true)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data?.data) return
    setName(String(data.data.name ?? ''))
    const prefs = (data.data.preferences ?? {}) as Record<string, unknown>
    const notifications = (prefs.notifications ?? {}) as Record<string, unknown>
    if (typeof notifications.email === 'boolean') setEmailNotif(notifications.email)
    if (typeof notifications.realTime === 'boolean') setRealtimeNotif(notifications.realTime)
    else if (notifications.realTime && typeof notifications.realTime === 'object') {
      setRealtimeNotif(Object.values(notifications.realTime as Record<string, boolean>).some(Boolean))
    }
  }, [data])

  async function onSaveProfile(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      const result = await updateProfile({ name: name.trim() }).unwrap()
      dispatch(setUser(toPublicUser(result.data as Record<string, unknown>)))
      setStatus(t('settings.saved'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.saveError')))
    }
  }

  async function onSavePrefs(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await updatePreferences({
        section: 'notifications',
        updates: { email: emailNotif, realTime: realtimeNotif },
      }).unwrap()
      setStatus(t('settings.saved'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.saveError')))
    }
  }

  if (isLoading) return <Loading label={t('common.loading')} />

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('common.settings') },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('settings.title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('settings.subtitle')}</p>
          </div>
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <Link to="/settings/upgrade">
              <Button variant="outline" size="sm">
                {t('settings.upgrade')}
              </Button>
            </Link>
            <p className="max-w-xs text-xs text-muted-foreground sm:text-end">{t('settings.upgradeHint')}</p>
          </div>
        </div>
      </section>

      {isError ? <Alert variant="error" title={t('settings.saveError')} /> : null}
      {error ? <Alert variant="error" title={t('settings.saveError')} description={error} /> : null}
      {status ? <Alert variant="success" title={status} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.profile')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex max-w-md flex-col gap-3" onSubmit={(event) => void onSaveProfile(event)}>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('settings.displayName')}</span>
              <Input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
            </label>
            <p className="text-sm text-muted-foreground">{data?.data.email}</p>
            <Button type="submit" variant="primary" disabled={savingProfile}>
              {savingProfile ? t('settings.saving') : t('settings.saveProfile')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ChangePasswordSettings />

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.appearance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('settings.themeHint')}</p>
        </CardContent>
      </Card>

      <TwoFactorSettings />

      <SessionsSettings />

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.preferences')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex max-w-md flex-col gap-3" onSubmit={(event) => void onSavePrefs(event)}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={emailNotif}
                onChange={(event) => setEmailNotif(event.target.checked)}
              />
              {t('settings.notifEmail')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={realtimeNotif}
                onChange={(event) => setRealtimeNotif(event.target.checked)}
              />
              {t('settings.notifRealtime')}
            </label>
            <Button type="submit" variant="primary" disabled={savingPrefs}>
              {savingPrefs ? t('settings.saving') : t('settings.savePrefs')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
