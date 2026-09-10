import { Button } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { ConnectionTone } from '@/types/health'

type HealthConnectionBannerProps = {
  tone: ConnectionTone
  onRetry: () => void
}

export function HealthConnectionBanner({ tone, onRetry }: HealthConnectionBannerProps) {
  const { t } = useI18n()
  if (tone === 'live') return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mb-4 rounded-xl border px-4 py-2 text-sm ${
        tone === 'offline'
          ? 'border-destructive/30 bg-destructive/10 text-destructive'
          : 'border-border/60 bg-muted/70 text-foreground'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>{tone === 'offline' ? t('health.liveOffline') : t('health.liveReconnecting')}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      </div>
    </div>
  )
}
