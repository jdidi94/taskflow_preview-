import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@taskflow/ui'
import { Check } from 'lucide-react'

import { useI18n } from '@/i18n'

type PlanId = 'starter' | 'pro' | 'enterprise'

const plans: Array<{
  id: PlanId
  nameKey: 'marketing.planStarter' | 'marketing.planPro' | 'marketing.planEnterprise'
  descKey: 'marketing.planStarterDesc' | 'marketing.planProDesc' | 'marketing.planEnterpriseDesc'
  monthly: number
  yearly: number
  popular?: boolean
  features: Array<
    | 'marketing.planFeatMembers5'
    | 'marketing.planFeatMembers25'
    | 'marketing.planFeatMembersUnlimited'
    | 'marketing.planFeatBoards'
    | 'marketing.planFeatAi'
    | 'marketing.planFeatAnalytics'
    | 'marketing.planFeatSupport'
    | 'marketing.planFeatSso'
    | 'marketing.planFeatIntegrations'
  >
}> = [
  {
    id: 'starter',
    nameKey: 'marketing.planStarter',
    descKey: 'marketing.planStarterDesc',
    monthly: 9,
    yearly: 7,
    features: ['marketing.planFeatMembers5', 'marketing.planFeatBoards', 'marketing.planFeatSupport'],
  },
  {
    id: 'pro',
    nameKey: 'marketing.planPro',
    descKey: 'marketing.planProDesc',
    monthly: 29,
    yearly: 23,
    popular: true,
    features: [
      'marketing.planFeatMembers25',
      'marketing.planFeatBoards',
      'marketing.planFeatAi',
      'marketing.planFeatAnalytics',
      'marketing.planFeatIntegrations',
      'marketing.planFeatSupport',
    ],
  },
  {
    id: 'enterprise',
    nameKey: 'marketing.planEnterprise',
    descKey: 'marketing.planEnterpriseDesc',
    monthly: 99,
    yearly: 79,
    features: [
      'marketing.planFeatMembersUnlimited',
      'marketing.planFeatBoards',
      'marketing.planFeatAi',
      'marketing.planFeatAnalytics',
      'marketing.planFeatIntegrations',
      'marketing.planFeatSso',
      'marketing.planFeatSupport',
    ],
  },
]

export function PricingContent() {
  const { t } = useI18n()
  const [yearly, setYearly] = useState(true)

  return (
    <div className="pb-16 pt-4">
      <section className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('marketing.navPricing')}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('marketing.pricingHeadline')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('marketing.pricingSubhead')}</p>
        <div className="mt-6 inline-flex rounded-lg border border-border/70 p-1 text-sm">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${!yearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => setYearly(false)}
          >
            {t('marketing.billingMonthly')}
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 ${yearly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            onClick={() => setYearly(true)}
          >
            {t('marketing.billingYearly')}
          </button>
        </div>
      </section>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-xl border p-6 ${
              plan.popular ? 'border-primary/50 bg-primary/5' : 'border-border/70'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{t(plan.nameKey)}</h2>
              {plan.popular ? (
                <span className="text-[10px] font-medium uppercase tracking-wide text-primary">
                  {t('marketing.popular')}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{t(plan.descKey)}</p>
            <p className="mt-6 font-display text-4xl font-semibold tracking-tight">
              ${yearly ? plan.yearly : plan.monthly}
              <span className="ms-1 text-base font-normal text-muted-foreground">
                {t('marketing.perMonth')}
              </span>
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2 text-sm">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{t(feature)}</span>
                </li>
              ))}
            </ul>
            <Link to="/register" className="mt-8">
              <Button variant={plan.popular ? 'primary' : 'outline'} className="w-full">
                {t('marketing.choosePlan')}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
