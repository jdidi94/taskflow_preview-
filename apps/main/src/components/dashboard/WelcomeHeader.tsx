import { Button } from '@taskflow/ui'
import { Plus } from 'lucide-react'

import { PageHero } from '@/components/common/PageHero'
import { useI18n } from '@/i18n'

type WelcomeHeaderProps = {
  firstName?: string
  onCreateWorkspace: () => void
}

export function WelcomeHeader({ firstName, onCreateWorkspace }: WelcomeHeaderProps) {
  const { t } = useI18n()

  return (
    <PageHero
      breadcrumbs={[{ label: t('common.dashboard') }]}
      title={firstName ? t('dashboard.helloName', { name: firstName }) : t('dashboard.hello')}
      description={t('dashboard.subtitle')}
      action={
        <Button variant="primary" onClick={onCreateWorkspace} className="gap-1.5">
          <Plus className="h-4 w-4" aria-hidden />
          {t('dashboard.newWorkspace')}
        </Button>
      }
    />
  )
}
