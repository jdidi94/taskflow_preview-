import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { AuthShell } from '@/components/auth'
import { useI18n } from '@/i18n'
import { setAccessToken } from '@/lib/authToken'
import { useLazyMeQuery } from '@/services/authApi'
import { useAppDispatch } from '@/store/hooks'
import { setBootstrapped, setCredentials } from '@/store/slices/authSlice'
import type { PublicUser } from '@/types/auth'

function asPublicUser(raw: Record<string, unknown>): PublicUser | null {
  const id = String(raw.id ?? raw._id ?? '')
  const email = String(raw.email ?? '')
  if (!id || !email) return null
  return {
    id,
    email,
    name: String(raw.name ?? email),
    avatar: (raw.avatar as string | null) ?? null,
    isActive: raw.isActive !== false,
    emailVerified: Boolean(raw.emailVerified),
    lastLogin: (raw.lastLogin as string | null) ?? null,
  }
}

export function OAuthCallbackPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const [fetchMe] = useLazyMeQuery()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')?.trim()
    if (!token) {
      setError(t('oauth.missingToken'))
      return
    }

    let cancelled = false
    void (async () => {
      try {
        setAccessToken(token)
        const me = await fetchMe().unwrap()
        const user = asPublicUser(me.data as unknown as Record<string, unknown>)
        if (!user) throw new Error('invalid user')
        if (cancelled) return
        dispatch(setCredentials({ token, user }))
        dispatch(setBootstrapped(true))
        navigate('/onboarding', { replace: true })
      } catch {
        if (!cancelled) setError(t('oauth.failed'))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [dispatch, fetchMe, navigate, searchParams, t])

  return (
    <AuthShell>
      <Card className="w-full max-w-md border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('oauth.completing')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <>
              <Alert variant="error" title={t('oauth.failed')} description={error} />
              <Link to="/login">
                <Button variant="primary">{t('auth.signIn')}</Button>
              </Link>
            </>
          ) : (
            <Loading label={t('oauth.completing')} />
          )}
        </CardContent>
      </Card>
    </AuthShell>
  )
}
