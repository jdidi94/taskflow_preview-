import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Check } from 'lucide-react'

import { AuthField } from '@/components/auth/AuthField'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useResetPasswordMutation } from '@/services/authApi'

export function ResetPasswordForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''
  const [resetPassword, { isLoading }] = useResetPasswordMutation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const requirements = useMemo(
    () => [
      { key: 'length', label: t('auth.reqLength'), met: password.length >= 8 },
      { key: 'letter', label: t('auth.reqLetter'), met: /[A-Za-z]/.test(password) },
      { key: 'number', label: t('auth.reqNumber'), met: /\d/.test(password) },
      {
        key: 'special',
        label: t('auth.reqSpecial'),
        met: /[@$!%*#?&]/.test(password),
      },
    ],
    [password, t],
  )

  const allMet = requirements.every((item) => item.met)
  const passwordsMatch = password.length > 0 && password === confirm

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!token) {
      setError(t('auth.resetMissingToken'))
      return
    }
    if (!allMet || !passwordsMatch) {
      setError(t('auth.resetValidation'))
      return
    }
    try {
      await resetPassword({ token, newPassword: password }).unwrap()
      setDone(true)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.resetFailed')))
    }
  }

  if (!token) {
    return (
      <Card className="w-full max-w-md border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('auth.resetTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Alert variant="error" title={t('auth.resetMissingToken')} />
          <Link className="text-sm font-medium text-primary" to="/forgot-password">
            {t('auth.requestNewLink')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="w-full max-w-md border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('auth.resetSuccessTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{t('auth.resetSuccessBody')}</p>
          <Button type="button" variant="primary" onClick={() => navigate('/login', { replace: true })}>
            {t('auth.signIn')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{t('auth.resetTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{t('auth.resetSubtitle')}</p>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          {error ? <Alert variant="error" title={t('auth.resetFailed')} description={error} /> : null}
          <AuthField
            label={t('auth.newPassword')}
            inputProps={{
              type: 'password',
              autoComplete: 'new-password',
              required: true,
              value: password,
              onChange: (event) => setPassword(event.target.value),
            }}
          />
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
          <AuthField
            label={t('auth.confirmPassword')}
            hint={
              confirm.length > 0 && !passwordsMatch ? t('auth.passwordMismatch') : undefined
            }
            inputProps={{
              type: 'password',
              autoComplete: 'new-password',
              required: true,
              value: confirm,
              onChange: (event) => setConfirm(event.target.value),
            }}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading || !allMet || !passwordsMatch}
          >
            {isLoading ? t('auth.resetting') : t('auth.resetSubmit')}
          </Button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          <Link className="font-medium text-primary" to="/login">
            {t('auth.backToSignIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
