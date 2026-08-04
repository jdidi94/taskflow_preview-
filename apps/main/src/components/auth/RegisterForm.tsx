import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { AuthField } from '@/components/auth/AuthField'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useRegisterMutation } from '@/services/authApi'
import { useAppDispatch } from '@/store/hooks'
import { setBootstrapped, setCredentials } from '@/store/slices/authSlice'

export function RegisterForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [register, { isLoading }] = useRegisterMutation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    try {
      const result = await register({ name, email, password }).unwrap()
      dispatch(setCredentials({ token: result.token, user: result.user }))
      dispatch(setBootstrapped(true))
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.registerFailed')))
    }
  }

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{t('auth.createAccountTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          {error ? (
            <Alert variant="error" title={t('auth.registerErrorTitle')} description={error} />
          ) : null}
          <AuthField
            label={t('common.name')}
            inputProps={{
              autoComplete: 'name',
              required: true,
              value: name,
              onChange: (event) => setName(event.target.value),
            }}
          />
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
            hint={t('auth.passwordHint')}
            inputProps={{
              type: 'password',
              autoComplete: 'new-password',
              required: true,
              minLength: 8,
              value: password,
              onChange: (event) => setPassword(event.target.value),
            }}
          />
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </Button>
          <OAuthButtons />
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link className="font-medium text-primary" to="/login">
            {t('auth.signIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
