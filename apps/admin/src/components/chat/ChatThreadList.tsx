import { Badge, Button, Input, Loading } from '@taskflow/ui'
import { Check, MessageSquare, RefreshCw, Search } from 'lucide-react'

import { AdminAvatar } from '@/components/common/AdminAvatar'
import { useI18n, type MessageKey } from '@/i18n'
import { chatDocId, customerOf, type SupportChat } from '@/types/chat'

type ChatThreadListProps = {
  chats: SupportChat[]
  selectedId: string | null
  loading?: boolean
  search: string
  onSearch: (value: string) => void
  onRefresh: () => void
  onSelect: (chat: SupportChat) => void
  onAccept: (chatId: string) => void
  acceptingId?: string | null
}

function statusVariant(status: string): 'success' | 'warning' | 'secondary' | 'error' {
  if (status === 'active') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'closed') return 'secondary'
  return 'secondary'
}

export function ChatThreadList({
  chats,
  selectedId,
  loading,
  search,
  onSearch,
  onRefresh,
  onSelect,
  onAccept,
  acceptingId,
}: ChatThreadListProps) {
  const { t } = useI18n()

  return (
    <div className="flex h-full min-h-0 w-full flex-col border-e border-border/70 md:w-80 md:shrink-0">
      <div className="space-y-3 border-b border-border/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t('chat.title')}</h2>
          <Button size="sm" variant="ghost" onClick={onRefresh} aria-label={t('common.refresh')}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="ps-9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder={t('chat.search')} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && chats.length === 0 ? <Loading label={t('common.loading')} /> : null}
        {!loading && chats.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-8 w-8" />
            {t('chat.emptyList')}
          </div>
        ) : null}
        {chats.map((chat) => {
          const id = chatDocId(chat)
          const customer = customerOf(chat)
          const preview = chat.lastMessage?.content || chat.messages?.at(-1)?.content || t('chat.noMessages')
          const unread = (chat.messages ?? []).filter((message) => !message.isRead && message.sender.model === 'User').length
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(chat)}
              className={`w-full border-b border-border/60 p-3 text-start transition-colors hover:bg-muted/60 ${
                selectedId === id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <AdminAvatar name={customer?.name} email={customer?.email} avatar={customer?.avatar} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{customer?.name || t('chat.unknownUser')}</p>
                    <Badge variant={statusVariant(chat.status)}>{statusLabel(chat.status, t)}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{preview}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{priorityLabel(chat.priority, t)}</span>
                    {unread > 0 ? <Badge variant="error">{unread}</Badge> : null}
                  </div>
                  {chat.status === 'pending' ? (
                    <Button
                      size="sm"
                      className="mt-2"
                      disabled={acceptingId === id}
                      onClick={(event) => {
                        event.stopPropagation()
                        onAccept(id)
                      }}
                    >
                      <Check className="me-1 h-4 w-4" />
                      {t('chat.accept')}
                    </Button>
                  ) : null}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function statusLabel(status: string, t: (key: MessageKey) => string) {
  if (status === 'active') return t('chat.statusActive')
  if (status === 'pending') return t('chat.statusPending')
  if (status === 'resolved') return t('chat.statusResolved')
  if (status === 'closed') return t('chat.statusClosed')
  return status
}

function priorityLabel(priority: string, t: (key: MessageKey) => string) {
  if (priority === 'urgent') return t('chat.priorityUrgent')
  if (priority === 'high') return t('chat.priorityHigh')
  if (priority === 'low') return t('chat.priorityLow')
  return t('chat.priorityMedium')
}
