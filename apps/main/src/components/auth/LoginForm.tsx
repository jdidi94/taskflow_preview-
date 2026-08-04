import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { AuthField } from '@/components/auth/AuthField'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCompleteLogin2FAMutation, useLoginMutation } from '@/services/authApi'
import { useAppDispatch } from '@/store/hooks'
import { setBootstrapped, setCredentials } from '@/store/slices/authSlice'
import type { AuthRequires2FA, PublicUser } from '@/types/auth'

type Pending2FA = Pick<AuthRequires2FA, 'userId' | 'sessionId' | 'rememberMe'>

function isAuthSuccess(
  value: unknown,
): value is {
  success: true
  token: string
  user: PublicUser
} {
  return Boolean(value && typeof value === 'object' && 'token' in value && 'user' in value)
}

export function LoginForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [login, { isLoading: loggingIn }] = useLoginMutation()
  const [complete2FA, { isLoading: verifying2FA }] = useCompleteLogin2FAMutation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [rememberDevice, setRememberDevice] = useState(false)
  const [pending2FA, setPending2FA] = useState<Pending2FA | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isLoading = loggingIn || verifying2FA

  async function finishLogin(result: unknown) {
    if (!isAuthSuccess(result)) {
      setError(t('auth.unexpectedLogin'))
      return
    }
    dispatch(setCredentials({ token: result.token, user: result.user }))
    dispatch(setBootstrapped(true))
    navigate('/dashboard', { replace: true })
  }

  async function onSubmitCredentials(event: FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      const result = await login({ email, password, rememberMe: true }).unwrap()
      if ('requires2FA' in result && result.requires2FA) {
        setPending2FA({
          userId: result.userId,
          sessionId: result.sessionId,
          rememberMe: result.rememberMe,
        })
        setCode('')
        return
      }
      await finishLogin(result)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.loginFailed')))
    }
  }

  async function onSubmit2FA(event: FormEvent) {
    event.preventDefault()
    if (!pending2FA) return
    setError(null)

    try {
      const result = await complete2FA({
        userId: pending2FA.userId,
        sessionId: pending2FA.sessionId,
        token: code.trim(),
        rememberMe: pending2FA.rememberMe,
        rememberDevice,
      }).unwrap()
      await finishLogin(result)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.twoFactorFailed')))
    }
  }

  function onBackFrom2FA() {
    setPending2FA(null)
    setCode('')
    setRememberDevice(false)
    setError(null)
  }

  if (pending2FA) {
    return (
      <Card className="w-full max-w-md border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('auth.twoFactorTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit2FA(event)}>
            {error ? (
              <Alert variant="error" title={t('auth.loginErrorTitle')} description={error} />
            ) : (
              <Alert variant="info" title={t('auth.twoFactorTitle')} description={t('auth.twoFactorDefault')} />
            )}
            <AuthField
              label={t('auth.twoFactorCode')}
              hint={t('auth.twoFactorCodeHint')}
              inputProps={{
                type: 'text',
                inputMode: 'text',
                autoComplete: 'one-time-code',
                autoFocus: true,
                required: true,
                value: code,
                onChange: (event) => setCode(event.target.value),
              }}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={(event) => setRememberDevice(event.target.checked)}
              />
              {t('auth.rememberDevice')}
            </label>
            <Button type="submit" variant="primary" disabled={isLoading || !code.trim()}>
              {isLoading ? t('auth.twoFactorVerifying') : t('auth.twoFactorVerify')}
            </Button>
            <Button type="button" variant="ghost" disabled={isLoading} onClick={onBackFrom2FA}>
              {t('auth.twoFactorBack')}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{t('auth.welcomeBack')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmitCredentials(event)}>
          {error ? <Alert variant="error" title={t('auth.loginErrorTitle')} description={error} /> : null}
          <AuthField
            label={t('common.email')}
            inputProps={{
              type: 'email',
              autoComplete: 'email',
              required: true,
              value: email,
              onChange: (event) => setEmail(event.target.value),
            }}
          />
          <AuthField
            label={t('common.password')}
            inputProps={{
              type: 'password',
              autoComplete: 'current-password',
              required: true,
              minLength: 8,
              value: password,
              onChange: (event) => setPassword(event.target.value),
            }}
          />
          <div className="flex justify-end">
            <Link className="text-sm font-medium text-primary" to="/forgot-password">
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
          <OAuthButtons />
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('auth.newHere')}{' '}
          <Link className="font-medium text-primary" to="/register">
            {t('auth.createAccount')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
