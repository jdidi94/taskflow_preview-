import { Button } from '@taskflow/ui'

import { useI18n } from '@/i18n'

export type AiPageMode = 'assistant' | 'generator'

type Props = {
  value: AiPageMode
  onChange: (value: AiPageMode) => void
}

export function AiModeTabs({ value, onChange }: Props) {
  const { t } = useI18n()

  const options: { id: AiPageMode; label: string }[] = [
    { id: 'assistant', label: t('ai.tabAssistant') },
    { id: 'generator', label: t('ai.tabGenerator') },
  ]

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('ai.title')}>
      {options.map((option) => (
        <Button
          key={option.id}
          size="sm"
          role="tab"
          aria-selected={value === option.id}
          variant={value === option.id ? 'primary' : 'outline'}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
