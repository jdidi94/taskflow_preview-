import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Badge, Button, Card, CardContent, Input, Loading } from '@taskflow/ui'

import { useToast } from '@/components/common/ToastProvider'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useBroadcastAdminNotificationMutation,
  useDeleteAdminNotificationMutation,
  useListAdminNotificationsQuery,
  useMarkAllAdminNotificationsReadMutation,
  useMarkAdminNotificationReadMutation,
} from '@/services/adminActivityApi'
import { useAppSelector } from '@/store/hooks'

export function AdminInboxPanel() {
  const { t, locale } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const role = useAppSelector((state) => state.auth.admin?.role)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [page, setPage] = useState(1)
  const query = useListAdminNotificationsQuery({
    page,
    limit: 20,
    isRead: filter === 'unread' ? 'false' : undefined,
  })
  const [markRead] = useMarkAdminNotificationReadMutation()
  const [markAll] = useMarkAllAdminNotificationsReadMutation()
  const [remove] = useDeleteAdminNotificationMutation()
  const [broadcast, { isLoading: broadcasting }] = useBroadcastAdminNotificationMutation()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const notifications = query.data?.data.notifications ?? []
  const unreadCount = query.data?.data.unreadCount ?? 0
  const pages = query.data?.data.pagination.pages ?? 1

  async function handleBroadcast() {
    if (!title.trim() || !message.trim()) return
    try {
      await broadcast({ title: title.trim(), message: message.trim() }).unwrap()
      setTitle('')
      setMessage('')
      toast.show({ message: t('activity.broadcastOk') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('activity.broadcastError')))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'all' ? 'primary' : 'outline'} onClick={() => { setFilter('all'); setPage(1) }}>
            {t('common.all')}
          </Button>
          <Button size="sm" variant={filter === 'unread' ? 'primary' : 'outline'} onClick={() => { setFilter('unread'); setPage(1) }}>
            {t('activity.unread')} ({unreadCount})
          </Button>
        </div>
        <Button size="sm" variant="outline" disabled={unreadCount === 0} onClick={() => void markAll()}>
          {t('activity.markAllRead')}
        </Button>
      </div>

      {error ? <Alert variant="error" title={error} /> : null}
      {query.isError ? <Alert variant="error" title={t('activity.loadInboxError')} /> : null}
      {query.isLoading ? <Loading label={t('common.loading')} /> : null}

      {!query.isLoading && notifications.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t('activity.emptyInbox')}</p>
      ) : null}

      <div className="space-y-3">
        {notifications.map((item) => (
          <Card key={item.id} className={item.isRead ? '' : 'border-primary/30 bg-primary/5'}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <button
                type="button"
                className="min-w-0 flex-1 text-start"
                onClick={() => {
                  if (!item.isRead) void markRead(item.id)
                  if (item.href) navigate(item.href)
                }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  {!item.isRead ? <Badge variant="secondary">{t('activity.unread')}</Badge> : null}
                  <Badge variant="outline">{item.priority}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleString(locale)}
                </p>
              </button>
              <div className="flex gap-2">
                {!item.isRead ? (
                  <Button size="sm" variant="outline" onClick={() => void markRead(item.id)}>
                    {t('activity.markRead')}
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => void remove(item.id)}>
                  {t('common.delete')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pages > 1 ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            {t('common.prev')}
          </Button>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((value) => value + 1)}>
            {t('common.next')}
          </Button>
        </div>
      ) : null}

      {role === 'super_admin' ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-medium">{t('activity.broadcast')}</p>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('activity.broadcastTitle')} />
            <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('activity.broadcastMessage')} />
            <Button
              variant="primary"
              disabled={broadcasting || !title.trim() || !message.trim()}
              onClick={() => void handleBroadcast()}
            >
              {t('activity.broadcastSend')}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
