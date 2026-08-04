import { Link, NavLink } from 'react-router'
import { ThemeToggle } from '@taskflow/theme'
import { Button } from '@taskflow/ui'

import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { useI18n } from '@/i18n'

const links = [
  { to: '/features', labelKey: 'marketing.navFeatures' as const },
  { to: '/pricing', labelKey: 'marketing.navPricing' as const },
  { to: '/about', labelKey: 'marketing.navAbout' as const },
  { to: '/contact', labelKey: 'marketing.navContact' as const },
]

type Props = {
  compact?: boolean
}

export function MarketingNav({ compact = false }: Props) {
  const { t } = useI18n()

  return (
    <header
      className={`flex flex-wrap items-center justify-between gap-3 ${compact ? '' : 'mb-10'}`}
    >
      <div className="flex flex-wrap items-center gap-6">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          {t('common.brand')}
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
        <Link to="/login">
          <Button variant="ghost">{t('landing.logIn')}</Button>
        </Link>
        <Link to="/register">
          <Button variant="primary">{t('landing.getStarted')}</Button>
        </Link>
      </div>
      <nav className="flex w-full flex-wrap gap-3 text-sm md:hidden">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
            }
          >
            {t(link.labelKey)}
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
