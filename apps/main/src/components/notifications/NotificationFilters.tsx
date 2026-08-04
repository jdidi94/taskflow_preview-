import { Button } from '@taskflow/ui'

import type { NotificationFilter } from '@/components/notifications/types'
import { useI18n } from '@/i18n'

type Props = {
  value: NotificationFilter
  onChange: (value: NotificationFilter) => void
}

export function NotificationFilters({ value, onChange }: Props) {
  const { t } = useI18n()

  const options: { id: NotificationFilter; label: string }[] = [
    { id: 'all', label: t('notifications.filterAll') },
    { id: 'unread', label: t('notifications.filterUnread') },
    { id: 'read', label: t('notifications.filterRead') },
  ]

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('notifications.title')}>
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
