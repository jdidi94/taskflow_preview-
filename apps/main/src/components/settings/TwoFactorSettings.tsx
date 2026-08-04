import { useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useDisable2FAMutation,
  useEnable2FAMutation,
  useGet2FAStatusQuery,
  useVerify2FASetupMutation,
} from '@/services/authApi'

type SetupPayload = {
  qrCode: string
  secret: string
  backupCodes: string[]
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback
  try {
    return new Date(value).toLocaleString()
  } catch {
    return fallback
  }
}

export function TwoFactorSettings() {
  const { t } = useI18n()
  const { data, isLoading, isError, refetch } = useGet2FAStatusQuery()
  const [enable2FA, { isLoading: enabling }] = useEnable2FAMutation()
  const [verifySetup, { isLoading: verifying }] = useVerify2FASetupMutation()
  const [disable2FA, { isLoading: disabling }] = useDisable2FAMutation()

  const [setup, setSetup] = useState<SetupPayload | null>(null)
  const [setupCode, setSetupCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const enabled = Boolean(data?.data.enabled)
  const busy = enabling || verifying || disabling

  async function onStartEnable() {
    setError(null)
    setStatus(null)
    try {
      const result = await enable2FA().unwrap()
      setSetup({
        qrCode: result.data.qrCode,
        secret: result.data.secret,
        backupCodes: result.data.backupCodes,
      })
      setSetupCode('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.twoFactorSetupError')))
    }
  }

  async function onConfirmSetup(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await verifySetup({ token: setupCode.trim() }).unwrap()
      setSetup(null)
      setSetupCode('')
      setStatus(t('settings.twoFactorEnabledToast'))
      await refetch()
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.twoFactorSetupError')))
    }
  }

  async function onDisable(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)
    try {
      await disable2FA({ token: disableCode.trim() }).unwrap()
      setDisableCode('')
      setStatus(t('settings.twoFactorDisabledToast'))
      await refetch()
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.twoFactorDisableError')))
    }
  }

  function onCancelSetup() {
    setSetup(null)
    setSetupCode('')
    setError(null)
  }

  if (isLoading) return <Loading label={t('common.loading')} />

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.twoFactor')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t('settings.twoFactorSubtitle')}</p>

        {isError ? (
          <Alert variant="error" title={t('settings.saveError')} description={t('settings.twoFactorLoadError')} />
        ) : null}
        {error ? <Alert variant="error" title={t('settings.saveError')} description={error} /> : null}
        {status ? <Alert variant="success" title={status} /> : null}

        {!setup && !enabled ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">{t('settings.twoFactorOff')}</p>
            <Button type="button" variant="primary" disabled={busy} onClick={() => void onStartEnable()}>
              {enabling ? t('settings.saving') : t('settings.twoFactorEnable')}
            </Button>
          </div>
        ) : null}

        {setup ? (
          <div className="flex max-w-lg flex-col gap-4">
            <p className="text-sm">{t('settings.twoFactorScan')}</p>
            <img
              src={setup.qrCode}
              alt={t('settings.twoFactorQrAlt')}
              className="h-48 w-48 rounded-md border border-border bg-white p-2"
            />
            <p className="break-all font-mono text-xs text-muted-foreground">
              {t('settings.twoFactorSecret')}: {setup.secret}
            </p>
            <div>
              <p className="mb-2 text-sm font-medium">{t('settings.twoFactorBackupCodes')}</p>
              <p className="mb-2 text-xs text-muted-foreground">{t('settings.twoFactorBackupHint')}</p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-xs sm:grid-cols-3">
                {setup.backupCodes.map((code) => (
                  <li key={code} className="rounded bg-muted/60 px-2 py-1 text-center">
                    {code}
                  </li>
                ))}
              </ul>
            </div>
            <form className="flex flex-col gap-3" onSubmit={(event) => void onConfirmSetup(event)}>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">{t('auth.twoFactorCode')}</span>
                <Input
                  value={setupCode}
                  onChange={(event) => setSetupCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" variant="primary" disabled={busy || !setupCode.trim()}>
                  {verifying ? t('auth.twoFactorVerifying') : t('settings.twoFactorConfirmSetup')}
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={onCancelSetup}>
                  {t('common.cancel')}
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {!setup && enabled ? (
          <div className="flex max-w-md flex-col gap-4">
            <Alert variant="success" title={t('settings.twoFactorOn')} />
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('settings.twoFactorEnabledAt')}</dt>
                <dd>{formatDate(data?.data.enabledAt ?? null, '—')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('settings.twoFactorLastUsed')}</dt>
                <dd>{formatDate(data?.data.lastUsed ?? null, '—')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{t('settings.twoFactorBackupRemaining')}</dt>
                <dd>{data?.data.backupCodesRemaining ?? 0}</dd>
              </div>
            </dl>
            <form className="flex flex-col gap-3" onSubmit={(event) => void onDisable(event)}>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">{t('settings.twoFactorDisableCode')}</span>
                <Input
                  value={disableCode}
                  onChange={(event) => setDisableCode(event.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </label>
              <Button type="submit" variant="destructive" disabled={busy || !disableCode.trim()}>
                {disabling ? t('settings.saving') : t('settings.twoFactorDisable')}
              </Button>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
