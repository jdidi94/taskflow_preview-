import { Bell } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import type { NotificationFilter } from '@/components/notifications/types'
import { useI18n } from '@/i18n'

type Props = {
  filter: NotificationFilter
}

export function NotificationEmptyState({ filter }: Props) {
  const { t } = useI18n()
  const filterLabel =
    filter === 'unread'
      ? t('notifications.filterUnread')
      : filter === 'read'
        ? t('notifications.filterRead')
        : t('notifications.filterAll')

  return (
    <EmptyState
      icon={Bell}
      title={t('notifications.emptyTitle')}
      description={
        filter === 'all'
          ? t('notifications.empty')
          : t('notifications.emptyFiltered', { filter: filterLabel })
      }
    />
  )
}
