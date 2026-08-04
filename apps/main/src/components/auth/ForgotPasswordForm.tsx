import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'
import { Mail } from 'lucide-react'

import { AuthField } from '@/components/auth/AuthField'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useRequestPasswordResetMutation } from '@/services/authApi'

export function ForgotPasswordForm() {
  const { t } = useI18n()
  const [requestReset, { isLoading }] = useRequestPasswordResetMutation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await requestReset({ email: email.trim() }).unwrap()
      setSent(true)
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.resetRequestFailed')))
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('auth.checkEmailTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-center text-sm text-muted-foreground">{t('auth.checkEmailBody')}</p>
          <p className="text-center text-sm font-medium text-primary">{email}</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSent(false)
              setEmail('')
            }}
          >
            {t('auth.tryDifferentEmail')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link className="font-medium text-primary" to="/login">
              {t('auth.backToSignIn')}
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{t('auth.forgotTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{t('auth.forgotSubtitle')}</p>
        <form className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          {error ? (
            <Alert variant="error" title={t('auth.resetRequestFailed')} description={error} />
          ) : null}
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
          <Button type="submit" variant="primary" disabled={isLoading || !email.trim()}>
            {isLoading ? t('auth.sendingReset') : t('auth.sendResetLink')}
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
