import { motion } from 'framer-motion'
import { LayoutGrid, Radio, Shield, Sparkles, BarChart3, Users } from 'lucide-react'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'

const items: Array<{ icon: typeof LayoutGrid; title: MessageKey; body: MessageKey }> = [
  { icon: LayoutGrid, title: 'marketing.featBoardsTitle', body: 'marketing.featBoardsBody' },
  { icon: Radio, title: 'marketing.featLiveTitle', body: 'marketing.featLiveBody' },
  { icon: Sparkles, title: 'marketing.featAiTitle', body: 'marketing.featAiBody' },
  { icon: Users, title: 'marketing.featTeamTitle', body: 'marketing.featTeamBody' },
  { icon: BarChart3, title: 'marketing.featAnalyticsTitle', body: 'marketing.featAnalyticsBody' },
  { icon: Shield, title: 'marketing.featSecurityTitle', body: 'marketing.featSecurityBody' },
]

export function FeaturesContent() {
  const { t } = useI18n()

  return (
    <div className="pb-16 pt-4">
      <section className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('marketing.navFeatures')}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('marketing.featuresHeadline')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('marketing.featuresSubhead')}</p>
      </section>

      <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ icon: Icon, title, body }, index) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
            className="flex flex-col gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">{t(title)}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{t(body)}</p>
          </motion.article>
        ))}
      </div>
    </div>
  )
}
