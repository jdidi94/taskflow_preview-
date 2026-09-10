import { useEffect, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Badge, Button, Input } from '@taskflow/ui'
import { MessageSquare, Send } from 'lucide-react'

import { AdminAvatar } from '@/components/common/AdminAvatar'
import { useI18n, type MessageKey } from '@/i18n'
import {
  customerOf,
  messageId,
  type ChatMessage,
  type ChatStatus,
  type SupportChat,
} from '@/types/chat'

type ChatConversationProps = {
  chat: SupportChat | null
  messages: ChatMessage[]
  draft: string
  typing?: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
  onStatusChange: (status: ChatStatus) => void
  onClose: () => void
  sending?: boolean
}

export function ChatConversation({
  chat,
  messages,
  draft,
  typing,
  onDraftChange,
  onSend,
  onStatusChange,
  onClose,
  sending,
}: ChatConversationProps) {
  const { t } = useI18n()
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing, chat?.id, chat?._id])

  if (!chat) {
    return (
      <div className="flex min-h-[20rem] flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground">
        <MessageSquare className="mb-3 h-12 w-12" />
        <p className="font-medium">{t('chat.emptyThread')}</p>
        <p className="mt-1 text-sm">{t('chat.emptyThreadHint')}</p>
      </div>
    )
  }

  const customer = customerOf(chat)
  const closed = chat.status === 'closed'

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSend()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <AdminAvatar name={customer?.name} email={customer?.email} avatar={customer?.avatar} />
          <div className="min-w-0">
            <p className="truncate font-medium">{customer?.name || t('chat.unknownUser')}</p>
            <p className="truncate text-xs text-muted-foreground">{customer?.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{priorityLabel(String(chat.priority), t)}</Badge>
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={chat.status}
            onChange={(event) => onStatusChange(event.target.value as ChatStatus)}
            disabled={closed}
          >
            <option value="pending">{t('chat.statusPending')}</option>
            <option value="active">{t('chat.statusActive')}</option>
            <option value="resolved">{t('chat.statusResolved')}</option>
            <option value="closed">{t('chat.statusClosed')}</option>
          </select>
          <Button size="sm" variant="outline" onClick={onClose} disabled={closed}>
            {t('chat.close')}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('chat.noMessages')}</p>
        ) : (
          messages.map((message) => {
            const mine = message.sender.model === 'Admin'
            return (
              <div key={messageId(message)} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm sm:max-w-md ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {!mine ? <p className="mb-1 text-xs opacity-80">{message.sender.name}</p> : null}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={`mt-1 text-[11px] ${mine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        {typing ? <p className="text-xs text-muted-foreground">{t('chat.typing', { name: customer?.name || t('chat.unknownUser') })}</p> : null}
        <div ref={endRef} />
      </div>

      <form className="flex gap-2 border-t border-border/70 p-3" onSubmit={handleSubmit}>
        <Input
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.composer')}
          disabled={closed || sending}
        />
        <Button type="submit" variant="primary" disabled={closed || sending || !draft.trim()} aria-label={t('chat.send')}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}

function priorityLabel(priority: string, t: (key: MessageKey) => string) {
  if (priority === 'urgent') return t('chat.priorityUrgent')
  if (priority === 'high') return t('chat.priorityHigh')
  if (priority === 'low') return t('chat.priorityLow')
  return t('chat.priorityMedium')
}
