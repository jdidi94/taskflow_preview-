import { Navigate } from 'react-router'

import { SocketLogsPanel } from '@/components/dev/SocketLogsPanel'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useI18n } from '@/i18n'

export function SocketLogsPage() {
  const { t } = useI18n()

  if (!import.meta.env.DEV) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('common.settings'), to: '/settings' },
            { label: t('socketLogs.title') },
          ]}
        />
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t('socketLogs.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t('socketLogs.subtitle')}</p>
      </section>

      <SocketLogsPanel />
    </div>
  )
}
