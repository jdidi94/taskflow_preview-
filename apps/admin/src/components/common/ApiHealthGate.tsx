import type { ReactNode } from 'react'
import { Loading } from '@taskflow/ui'

import { MaintenanceScreen } from '@/components/common/MaintenanceScreen'
import { useApiHealth } from '@/hooks/useApiHealth'
import { useI18n } from '@/i18n'

export function ApiHealthGate({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const { phase, reason, checking, refresh } = useApiHealth()

  if (phase === 'checking') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-6">
        <Loading label={t('maintenance.checking')} size="lg" />
      </div>
    )
  }

  if (phase === 'unhealthy') {
    return <MaintenanceScreen reason={reason} checking={checking} onRetry={() => void refresh()} />
  }

  return children
}
