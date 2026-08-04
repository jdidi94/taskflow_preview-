import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ThemeToggle } from '@taskflow/theme'

import { LandingBoardMock } from '@/components/auth/LandingBoardMock'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useI18n } from '@/i18n'

type Props = {
  children: ReactNode
  accent?: 'primary' | 'accent'
}

export function AuthShell({ children, accent = 'primary' }: Props) {
  const { t } = useI18n()
  const panelWash =
    accent === 'accent'
      ? 'bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--accent)/0.18),transparent_55%),hsl(var(--background))]'
      : 'bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.16),transparent_55%),hsl(var(--background))]'

  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-2">
      <aside
        className={`relative hidden min-h-screen overflow-hidden border-e border-border/40 lg:flex lg:flex-col ${panelWash}`}
      >
        <div className="pointer-events-none absolute inset-0 opacity-90">
          <LandingBoardMock />
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--background)/0.55)_0%,hsl(var(--background)/0.2)_35%,hsl(var(--background)/0.75)_100%)]"
        />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Link
            to="/"
            className="font-display text-2xl font-semibold tracking-tight text-primary"
          >
            {t('common.brand')}
          </Link>

          <div className="max-w-md pb-6">
            <motion.p
              className="font-display text-5xl font-semibold tracking-tight text-primary xl:text-6xl"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {t('common.brand')}
            </motion.p>
            <motion.p
              className="mt-4 text-lg text-muted-foreground"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              {t('auth.panelSubhead')}
            </motion.p>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between gap-3 px-4 pt-6 sm:px-8 sm:pt-8">
          <Link
            to="/"
            className="font-display text-lg font-semibold text-primary lg:invisible lg:pointer-events-none"
          >
            {t('common.brand')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  )
}
