import { motion } from 'framer-motion'
import { Heart, Lightbulb, Shield, Users } from 'lucide-react'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'

const values: Array<{ icon: typeof Heart; title: MessageKey; body: MessageKey }> = [
  { icon: Heart, title: 'marketing.aboutValueUsersTitle', body: 'marketing.aboutValueUsersBody' },
  { icon: Lightbulb, title: 'marketing.aboutValueCraftTitle', body: 'marketing.aboutValueCraftBody' },
  { icon: Shield, title: 'marketing.aboutValueTrustTitle', body: 'marketing.aboutValueTrustBody' },
  { icon: Users, title: 'marketing.aboutValueTeamTitle', body: 'marketing.aboutValueTeamBody' },
]

export function AboutContent() {
  const { t } = useI18n()

  return (
    <div className="pb-16 pt-4">
      <section className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('marketing.navAbout')}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('marketing.aboutHeadline')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('marketing.aboutSubhead')}</p>
      </section>

      <section className="mt-14 max-w-3xl space-y-4 text-base leading-relaxed text-muted-foreground">
        <p>{t('marketing.aboutStory1')}</p>
        <p>{t('marketing.aboutStory2')}</p>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{t('marketing.aboutValuesTitle')}</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {values.map(({ icon: Icon, title, body }, index) => (
            <motion.article
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="flex flex-col gap-2"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden />
              <h3 className="font-semibold">{t(title)}</h3>
              <p className="text-sm text-muted-foreground">{t(body)}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  )
}
