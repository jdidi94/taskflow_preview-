import { Button } from '@taskflow/ui'
import { Wrench } from 'lucide-react'

import { AdminBrandLogo } from '@/components/common/AdminBrandLogo'
import { useI18n } from '@/i18n'

type MaintenanceScreenProps = {
  reason?: 'unreachable' | 'degraded' | null
  checking?: boolean
  onRetry: () => void
}

export function MaintenanceScreen({ reason, checking = false, onRetry }: MaintenanceScreenProps) {
  const { t } = useI18n()
  const body =
    reason === 'degraded' ? t('maintenance.bodyDb') : t('maintenance.bodyOffline')

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)_0%,transparent_55%)] opacity-[0.12]"
      />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-6">
        <AdminBrandLogo className="h-10 sm:h-12" />
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-muted/40 text-muted-foreground">
          <Wrench className="h-7 w-7" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('maintenance.title')}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{body}</p>
          <p className="text-sm text-muted-foreground">{t('maintenance.hint')}</p>
        </div>
        <Button type="button" onClick={onRetry} disabled={checking} className="min-w-[10rem]">
          {checking ? t('maintenance.checking') : t('maintenance.retry')}
        </Button>
      </div>
    </div>
  )
}
