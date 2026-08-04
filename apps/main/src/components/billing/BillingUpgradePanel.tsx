import { useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateCheckoutSessionMutation } from '@/services/checkoutApi'

export function BillingUpgradePanel() {
  const { t } = useI18n()
  const [plan, setPlan] = useState<'basic' | 'premium'>('premium')
  const [createSession, { isLoading }] = useCreateCheckoutSessionMutation()
  const [error, setError] = useState<string | null>(null)

  async function onCheckout() {
    setError(null)
    try {
      const session = await createSession({ plan }).unwrap()
      if (session.url) {
        window.location.assign(session.url)
        return
      }
      setError(t('billing.checkoutError'))
    } catch (err) {
      const message = getApiErrorMessage(err, t('billing.checkoutError'))
      setError(message.includes('Stripe') ? t('billing.stripeMissing') : message)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('common.settings'), to: '/settings' },
            { label: t('billing.title') },
          ]}
        />
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('billing.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('billing.subtitle')}</p>
      </section>

      {error ? <Alert variant="error" title={t('billing.checkoutError')} description={error} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {(['basic', 'premium'] as const).map((item) => (
          <Card
            key={item}
            className={plan === item ? 'border-primary' : 'border-border/70'}
            onClick={() => setPlan(item)}
          >
            <CardHeader>
              <CardTitle>{item === 'premium' ? t('billing.planPremium') : t('billing.planBasic')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {item === 'premium' ? '$29 / mo' : '$12 / mo'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="primary" disabled={isLoading} onClick={() => void onCheckout()}>
        {isLoading ? t('billing.starting') : t('billing.checkout')}
      </Button>

      <Link to="/settings" className="text-sm text-primary">
        {t('billing.backSettings')}
      </Link>
    </div>
  )
}
