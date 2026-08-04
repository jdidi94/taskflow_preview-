import { Link } from 'react-router'

import { useI18n } from '@/i18n'

export function MarketingFooter() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/60 bg-muted/20 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-primary">{t('common.brand')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('landing.footerCopy', { year })}</p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <p className="font-medium">{t('marketing.footerProduct')}</p>
              <Link to="/features" className="text-muted-foreground hover:text-foreground">
                {t('marketing.navFeatures')}
              </Link>
              <Link to="/pricing" className="text-muted-foreground hover:text-foreground">
                {t('marketing.navPricing')}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium">{t('marketing.footerCompany')}</p>
              <Link to="/about" className="text-muted-foreground hover:text-foreground">
                {t('marketing.navAbout')}
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-foreground">
                {t('marketing.navContact')}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium">{t('marketing.footerAccount')}</p>
              <Link to="/login" className="text-muted-foreground hover:text-foreground">
                {t('landing.logIn')}
              </Link>
              <Link to="/register" className="text-muted-foreground hover:text-foreground">
                {t('landing.getStarted')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
