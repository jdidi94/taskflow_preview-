import { useState } from 'react'
import { Button } from '@taskflow/ui'

import { AuditLogPanel } from '@/components/audit/AuditLogPanel'
import { PageHeader } from '@/components/common/PageHeader'
import { AdminInboxPanel } from '@/components/notifications/AdminInboxPanel'
import { useI18n } from '@/i18n'

export function ActivityPanel() {
  const { t } = useI18n()
  const [tab, setTab] = useState<'inbox' | 'audit'>('inbox')

  return (
    <div>
      <PageHeader title={t('activity.title')} subtitle={t('activity.subtitle')} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label={t('activity.tabs')}>
        <Button size="sm" variant={tab === 'inbox' ? 'primary' : 'outline'} onClick={() => setTab('inbox')}>
          {t('activity.tabInbox')}
        </Button>
        <Button size="sm" variant={tab === 'audit' ? 'primary' : 'outline'} onClick={() => setTab('audit')}>
          {t('activity.tabAudit')}
        </Button>
      </div>
      {tab === 'inbox' ? <AdminInboxPanel /> : <AuditLogPanel />}
    </div>
  )
}
