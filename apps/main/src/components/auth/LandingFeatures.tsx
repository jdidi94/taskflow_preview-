import { motion } from 'framer-motion'
import { LayoutGrid, Radio, Sparkles } from 'lucide-react'

import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n'

const features: Array<{
  icon: typeof LayoutGrid
  titleKey: MessageKey
  bodyKey: MessageKey
}> = [
  {
    icon: LayoutGrid,
    titleKey: 'landing.featureBoardsTitle',
    bodyKey: 'landing.featureBoardsBody',
  },
  {
    icon: Radio,
    titleKey: 'landing.featureLiveTitle',
    bodyKey: 'landing.featureLiveBody',
  },
  {
    icon: Sparkles,
    titleKey: 'landing.featureAiTitle',
    bodyKey: 'landing.featureAiBody',
  },
]

export function LandingFeatures() {
  const { t } = useI18n()

  return (
    <section className="border-t border-border/60 bg-background py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('landing.featuresTitle')}
          </h2>
          <p className="mt-3 text-muted-foreground">{t('landing.featuresSubhead')}</p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {features.map(({ icon: Icon, titleKey, bodyKey }, index) => (
            <motion.article
              key={titleKey}
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{t(bodyKey)}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
