import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { ThemeToggle } from '@taskflow/theme'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@taskflow/ui'
import { Eye, EyeOff } from 'lucide-react'

import { AdminBrandLogo } from '@/components/common/AdminBrandLogo'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { ADMIN_PASSWORD_RE, ADMIN_USERNAME_RE } from '@/lib/credentialRules'
import {
  useCompleteLogin2FAMutation,
  useLoginMutation,
  useSetupFirstAdminMutation,
  useSetupStatusQuery,
} from '@/services/adminAuthApi'
import { useAppDispatch } from '@/store/hooks'
import { setBootstrapped, setCredentials } from '@/store/slices/authSlice'
import type { AuthRequires2FA, AuthSuccess, PublicAdmin } from '@/types/auth'

function isAuthSuccess(value: unknown): value is AuthSuccess {
  if (!value || typeof value !== 'object' || !('data' in value)) return false
  const data = (value as AuthSuccess).data
  return Boolean(data && typeof data === 'object' && 'token' in data && 'admin' in data)
}

function isRequires2FA(value: unknown): value is AuthRequires2FA {
  if (!value || typeof value !== 'object' || !('data' in value)) return false
  const data = (value as AuthRequires2FA).data
  return Boolean(data && typeof data === 'object' && 'requires2FA' in data && data.requires2FA)
}

export function LoginForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const setupStatus = useSetupStatusQuery()
  const [login, { isLoading: loggingIn }] = useLoginMutation()
  const [complete2FA, { isLoading: verifying }] = useCompleteLogin2FAMutation()
  const [setupFirst, { isLoading: settingUp }] = useSetupFirstAdminMutation()

  const needsSetup = Boolean(setupStatus.data?.data.needsSetup)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [useBackup, setUseBackup] = useState(false)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [twoFaMessage, setTwoFaMessage] = useState<string | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [setupName, setSetupName] = useState('super_admin')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (needsSetup) setShowSetup(true)
  }, [needsSetup])

  const isLoading = loggingIn || verifying || settingUp
  const inSetup = needsSetup && showSetup && !pendingUserId

  function finish(admin: PublicAdmin, token: string) {
    dispatch(setCredentials({ admin, token }))
    dispatch(setBootstrapped(true))
    navigate('/dashboard', { replace: true })
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const result = await login({ email, password, rememberMe: rememberDevice }).unwrap()
      if (isRequires2FA(result)) {
        setPendingUserId(String(result.data.userId))
        setTwoFaMessage(result.data.message ?? t('auth.twoFactorDefault'))
        setCode('')
        return
      }
      if (!isAuthSuccess(result)) {
        setError(t('auth.unexpectedLogin'))
        return
      }
      finish(result.data.admin, result.data.token)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.loginFailed')))
    }
  }

  async function onVerify(event: FormEvent) {
    event.preventDefault()
    if (!pendingUserId) return
    setError(null)
    try {
      const result = await complete2FA({
        userId: pendingUserId,
        token: code.trim(),
        rememberMe: rememberDevice,
      }).unwrap()
      if (!isAuthSuccess(result)) {
        setError(t('auth.unexpectedLogin'))
        return
      }
      finish(result.data.admin, result.data.token)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.twoFactorFailed')))
    }
  }

  async function onSetup(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!ADMIN_USERNAME_RE.test(setupName.trim())) {
      setError(t('auth.usernameHint'))
      return
    }
    if (!ADMIN_PASSWORD_RE.test(password)) {
      setError(t('auth.passwordHint'))
      return
    }
    try {
      const result = await setupFirst({
        userName: setupName.trim(),
        userEmail: email.trim(),
        password,
      }).unwrap()
      if (!isAuthSuccess(result)) {
        setError(t('auth.setupFirstFailed'))
        return
      }
      finish(result.data.admin, result.data.token)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.setupFirstFailed')))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex justify-center">
            <AdminBrandLogo className="h-12" />
          </div>
          <h1 className="font-display text-2xl font-semibold">{t('auth.title')}</h1>
          <p className="text-sm text-muted-foreground">
            {pendingUserId
              ? (twoFaMessage ?? t('auth.twoFactorDefault'))
              : inSetup
                ? t('auth.setupFirstSubtitle')
                : t('auth.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {pendingUserId ? t('auth.twoFactorTitle') : inSetup ? t('auth.setupFirstTitle') : t('auth.login')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error ? <Alert variant="error" title={t('common.error')} description={error} className="mb-4" /> : null}

            {pendingUserId ? (
              <form className="space-y-4" onSubmit={(event) => void onVerify(event)}>
                <div className="flex justify-center gap-2">
                  <Button type="button" size="sm" variant={useBackup ? 'outline' : 'primary'} onClick={() => setUseBackup(false)}>
                    {t('auth.twoFactorApp')}
                  </Button>
                  <Button type="button" size="sm" variant={useBackup ? 'primary' : 'outline'} onClick={() => setUseBackup(true)}>
                    {t('auth.twoFactorBackup')}
                  </Button>
                </div>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span>{useBackup ? t('auth.twoFactorBackupCode') : t('auth.twoFactorCode')}</span>
                  <Input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="text-center font-mono tracking-widest"
                    autoComplete="one-time-code"
                    required
                  />
                </label>
                {!useBackup ? (
                  <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberDevice}
                        onChange={(event) => setRememberDevice(event.target.checked)}
                      />
                      {t('auth.rememberMe')}
                    </span>
                    <span className="text-xs">{t('auth.rememberMeHint')}</span>
                  </label>
                ) : null}
                <Button type="submit" variant="primary" className="w-full" disabled={isLoading || !code.trim()}>
                  {verifying ? t('auth.twoFactorVerifying') : t('auth.twoFactorVerify')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPendingUserId(null)
                    setCode('')
                    setError(null)
                  }}
                >
                  {t('auth.twoFactorCancel')}
                </Button>
              </form>
            ) : inSetup ? (
              <form className="space-y-4" onSubmit={(event) => void onSetup(event)}>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span>{t('auth.setupFirstUsername')}</span>
                  <Input value={setupName} onChange={(event) => setSetupName(event.target.value)} required />
                  <span className="text-xs text-muted-foreground">{t('auth.usernameHint')}</span>
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span>{t('common.email')}</span>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span>{t('common.password')}</span>
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                  <span className="text-xs text-muted-foreground">{t('auth.passwordHint')}</span>
                </label>
                <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                  {settingUp ? t('common.loading') : t('auth.setupFirstSubmit')}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => setShowSetup(false)}>
                  {t('common.cancel')}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={(event) => void onSubmit(event)}>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span>{t('common.email')}</span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    disabled={isLoading}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm">
                  <span>{t('common.password')}</span>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      className="pe-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 end-2 text-muted-foreground"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(event) => setRememberDevice(event.target.checked)}
                    />
                    {t('auth.rememberMe')}
                  </span>
                  <span className="text-xs">{t('auth.rememberMeHint')}</span>
                </label>
                <Button type="submit" variant="primary" className="w-full" disabled={isLoading}>
                  {loggingIn ? t('auth.signingIn') : t('auth.signIn')}
                </Button>
                {needsSetup ? (
                  <button
                    type="button"
                    className="w-full text-center text-sm text-primary hover:underline"
                    onClick={() => {
                      setShowSetup(true)
                      setError(null)
                    }}
                  >
                    {t('auth.setupFirstTitle')}
                  </button>
                ) : null}
                {import.meta.env.DEV ? (
                  <p className="text-center text-xs text-muted-foreground">{t('auth.demoHint')}</p>
                ) : null}
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
        <p className="text-center text-xs text-muted-foreground">{t('auth.footer')}</p>
      </div>
    </div>
  )
}
