import { useState } from 'react'

import { AiAssistantChat } from '@/components/ai/AiAssistantChat'
import { AiBoardGenerator } from '@/components/ai/AiBoardGenerator'
import { AiModeTabs, type AiPageMode } from '@/components/ai/AiModeTabs'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useI18n } from '@/i18n'

export function AiPage() {
  const { t } = useI18n()
  const [mode, setMode] = useState<AiPageMode>('assistant')

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('ai.title') },
          ]}
        />
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('ai.title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('ai.subtitle')}</p>
        </div>
        <AiModeTabs value={mode} onChange={setMode} />
      </section>

      {mode === 'assistant' ? <AiAssistantChat /> : <AiBoardGenerator embedded />}
    </div>
  )
}
