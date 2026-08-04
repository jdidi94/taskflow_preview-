import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Button } from '@taskflow/ui'

import { LandingBoardMock } from '@/components/auth/LandingBoardMock'
import { MarketingNav } from '@/components/marketing/MarketingNav'
import { useI18n } from '@/i18n'

export function LandingHero() {
  const { t, isRTL } = useI18n()

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <LandingBoardMock />

      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          isRTL
            ? 'bg-[linear-gradient(255deg,hsl(var(--background))_0%,hsl(var(--background)/0.94)_38%,hsl(var(--background)/0.55)_62%,transparent_88%)]'
            : 'bg-[linear-gradient(105deg,hsl(var(--background))_0%,hsl(var(--background)/0.94)_38%,hsl(var(--background)/0.55)_62%,transparent_88%)]'
        }`}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <MarketingNav compact />

        <section className="flex flex-1 flex-col justify-center gap-5 py-16 sm:max-w-xl lg:max-w-lg">
          <motion.p
            className="font-display text-5xl font-semibold tracking-tight text-primary sm:text-6xl md:text-7xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
          >
            {t('common.brand')}
          </motion.p>
          <motion.h1
            className="font-display text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
          >
            {t('landing.headline')}
          </motion.h1>
          <motion.p
            className="max-w-md text-base text-muted-foreground sm:text-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.26 }}
          >
            {t('landing.subhead')}
          </motion.p>
          <motion.div
            className="flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.34 }}
          >
            <Link to="/register">
              <Button variant="primary" size="lg">
                {t('landing.startFree')}
              </Button>
            </Link>
            <Link to="/features">
              <Button variant="outline" size="lg">
                {t('marketing.navFeatures')}
              </Button>
            </Link>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
