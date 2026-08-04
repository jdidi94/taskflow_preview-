import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alert, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'

import { useI18n } from '@/i18n'

export function GitHubLinkCallbackPage() {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const state = searchParams.get('state')

    if (error) {
      const text = errorDescription || error
      setStatus('error')
      setMessage(text)
      window.opener?.postMessage(
        { type: 'GITHUB_LINK_OAUTH_ERROR', error: text },
        window.location.origin,
      )
      return
    }

    if (!code) {
      setStatus('error')
      setMessage(t('github.missingCode'))
      window.opener?.postMessage(
        { type: 'GITHUB_LINK_OAUTH_ERROR', error: 'missing_code' },
        window.location.origin,
      )
      return
    }

    setStatus('success')
    setMessage(t('github.linkSuccess'))
    window.opener?.postMessage(
      { type: 'GITHUB_LINK_OAUTH_SUCCESS', code, state },
      window.location.origin,
    )
    window.setTimeout(() => window.close(), 1200)
  }, [searchParams, t])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md border-border/70">
        <CardHeader>
          <CardTitle>{t('github.callbackTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'loading' ? <Loading label={t('github.connecting')} /> : null}
          {status === 'success' ? <Alert variant="success" title={message} /> : null}
          {status === 'error' ? <Alert variant="error" title={t('github.linkError')} description={message} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}
