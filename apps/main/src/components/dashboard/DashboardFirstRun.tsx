import { useNavigate } from 'react-router'
import { Button } from '@taskflow/ui'
import { Sparkles } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { PendingInvitesList } from '@/components/invites'
import { useI18n } from '@/i18n'

type Props = {
  pendingInviteCount: number
}

export function DashboardFirstRun({ pendingInviteCount }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-8">
      <EmptyState
        icon={Sparkles}
        title={t('onboarding.firstRunTitle')}
        description={t('onboarding.firstRunBody')}
        action={
          <Button variant="primary" onClick={() => navigate('/onboarding')}>
            {t('onboarding.firstRunCta')}
          </Button>
        }
      />
      {pendingInviteCount > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('onboarding.firstRunInvites')}</h2>
          <PendingInvitesList />
        </section>
      ) : null}
    </div>
  )
}
