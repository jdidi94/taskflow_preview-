import { useState } from 'react'
import { Link } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle } from '@taskflow/ui'

import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateCheckoutSessionMutation } from '@/services/checkoutApi'

/** Mirrors backend `PLAN_LIMITS` for basic / premium checkout SKUs. */
const PLAN_UNLOCKS = {
  basic: { price: 12, aiJobs: 50, seats: 10, spaces: 5 },
  premium: { price: 29, aiJobs: 250, seats: 50, spaces: 25 },
} as const

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
        {(['basic', 'premium'] as const).map((item) => {
          const unlocks = PLAN_UNLOCKS[item]
          return (
            <Card
              key={item}
              className={`cursor-pointer ${plan === item ? 'border-primary' : 'border-border/70'}`}
              onClick={() => setPlan(item)}
            >
              <CardHeader>
                <CardTitle>{item === 'premium' ? t('billing.planPremium') : t('billing.planBasic')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-lg font-semibold tabular-nums">
                  {t('billing.priceMonthly', { price: unlocks.price })}
                </p>
                <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                  <li>{t('billing.featAiJobs', { count: unlocks.aiJobs })}</li>
                  <li>{t('billing.featSeats', { count: unlocks.seats })}</li>
                  <li>{t('billing.featSpaces', { count: unlocks.spaces })}</li>
                </ul>
              </CardContent>
            </Card>
          )
        })}
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
