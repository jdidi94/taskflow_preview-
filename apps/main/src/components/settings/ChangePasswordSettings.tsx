import { useMemo, useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@taskflow/ui'
import { Check } from 'lucide-react'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useChangePasswordMutation } from '@/services/authApi'

export function ChangePasswordSettings() {
  const { t } = useI18n()
  const [changePassword, { isLoading }] = useChangePasswordMutation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const requirements = useMemo(
    () => [
      { key: 'length', label: t('auth.reqLength'), met: newPassword.length >= 8 },
      { key: 'letter', label: t('auth.reqLetter'), met: /[A-Za-z]/.test(newPassword) },
      { key: 'number', label: t('auth.reqNumber'), met: /\d/.test(newPassword) },
      {
        key: 'special',
        label: t('auth.reqSpecial'),
        met: /[@$!%*#?&]/.test(newPassword),
      },
    ],
    [newPassword, t],
  )

  const allMet = requirements.every((item) => item.met)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirm
  const differentFromCurrent =
    currentPassword.length > 0 && newPassword.length > 0 && currentPassword !== newPassword

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setStatus(null)

    if (!allMet || !passwordsMatch) {
      setError(t('settings.passwordValidation'))
      return
    }
    if (!differentFromCurrent) {
      setError(t('settings.passwordSameAsCurrent'))
      return
    }

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
      setStatus(t('settings.passwordChanged'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('settings.passwordChangeError')))
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.changePassword')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{t('settings.changePasswordSubtitle')}</p>
        <form className="flex max-w-md flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
          {error ? (
            <Alert variant="error" title={t('settings.passwordChangeError')} description={error} />
          ) : null}
          {status ? <Alert variant="success" title={status} /> : null}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('settings.currentPassword')}</span>
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('auth.newPassword')}</span>
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>

          <ul className="space-y-1.5 text-xs text-muted-foreground">
            {requirements.map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                <Check
                  className={`h-3.5 w-3.5 ${item.met ? 'text-primary' : 'text-muted-foreground/40'}`}
                  aria-hidden
                />
                <span className={item.met ? 'text-foreground' : undefined}>{item.label}</span>
              </li>
            ))}
          </ul>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('auth.confirmPassword')}</span>
            <Input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {confirm.length > 0 && !passwordsMatch ? (
              <span className="text-xs text-destructive">{t('auth.passwordMismatch')}</span>
            ) : null}
          </label>

          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !allMet || !passwordsMatch || !currentPassword}
          >
            {isLoading ? t('settings.saving') : t('settings.changePasswordSubmit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
