import { locales, useI18n, type Locale } from '@/i18n'
import { focusRingClassName } from '@/lib/focusRing'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()

  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        className={`h-8 max-w-[7.5rem] rounded-md border border-border bg-background px-2 text-foreground sm:max-w-none ${focusRingClassName}`}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        {locales.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}
