import { useI18n } from '@/i18n'

export function RouteFallback() {
  const { t } = useI18n()
  return (
    <div
      className="flex min-h-[30vh] items-center justify-center px-6 py-12 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      {t('common.loading')}
    </div>
  )
}
