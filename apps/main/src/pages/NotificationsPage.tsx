import { useMemo, useState } from 'react'
import { Card, CardContent, Loading } from '@taskflow/ui'

import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { PaginationBar } from '@/components/common/PaginationBar'
import {
  NotificationEmptyState,
  NotificationFilters,
  NotificationItem,
  NotificationToolbar,
  type NotificationFilter,
} from '@/components/notifications'
import { useI18n } from '@/i18n'
import {
  useClearReadMutation,
  useDeleteNotificationMutation,
  useListNotificationsQuery,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
} from '@/services/notificationsApi'
import { normalizeListPagination } from '@/types/pagination'

const PAGE_SIZE = 20

export function NotificationsPage() {
  const { t } = useI18n()
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(PAGE_SIZE)

  const listArgs = useMemo(() => {
    const base = { page, limit }
    if (filter === 'unread') return { ...base, isRead: 'false' as const }
    if (filter === 'read') return { ...base, isRead: 'true' as const }
    return base
  }, [filter, page, limit])

  const { data, isLoading, isFetching, isError, error } = useListNotificationsQuery(listArgs)
  const [markAsRead, { isLoading: markingOne }] = useMarkAsReadMutation()
  const [markAllAsRead, { isLoading: markingAll }] = useMarkAllAsReadMutation()
  const [deleteNotification, { isLoading: deleting }] = useDeleteNotificationMutation()
  const [clearRead, { isLoading: clearing }] = useClearReadMutation()

  const notifications = data?.data.notifications ?? []
  const unreadCount = data?.data.unreadCount ?? 0
  const pagination = normalizeListPagination(data?.data.pagination ?? { page, limit, totalItems: 0 })
  const busy = markingOne || deleting

  function onFilterChange(next: NotificationFilter) {
    setFilter(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('common.notifications') },
          ]}
        />
        <NotificationToolbar
          unreadCount={unreadCount}
          markingAll={markingAll}
          clearing={clearing}
          onMarkAllRead={() => void markAllAsRead()}
          onClearRead={() => void clearRead()}
        />
      </section>

      <NotificationFilters value={filter} onChange={onFilterChange} />

      {isLoading ? <Loading label={t('notifications.loading')} /> : null}

      {isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {t('notifications.loadError')}
            {error && 'status' in error ? ` (${String(error.status)})` : ''}.
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isError && notifications.length === 0 ? (
        <NotificationEmptyState filter={filter} />
      ) : null}

      <div
        className={`flex flex-col gap-3 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}
      >
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            busy={busy}
            onMarkRead={(id) => void markAsRead({ id })}
            onDelete={(id) => void deleteNotification({ id })}
          />
        ))}
      </div>

      {!isError && pagination.totalItems > 0 ? (
        <PaginationBar
          pagination={pagination}
          onPageChange={setPage}
          onLimitChange={(next) => {
            setLimit(next)
            setPage(1)
          }}
          pageSizeOptions={[10, 20, 40, 60]}
        />
      ) : null}
    </div>
  )
}
