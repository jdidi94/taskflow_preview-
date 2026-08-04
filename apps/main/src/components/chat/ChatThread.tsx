import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import { Button, Input, Loading } from '@taskflow/ui'

import { ChatMessageItem } from '@/components/chat/ChatMessageItem'
import { useI18n } from '@/i18n'
import type { ChatMessage } from '@/types/chat'

type ChatComposerProps = {
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
  placeholder: string
  submitLabel: string
  disabled?: boolean
  className?: string
}

export function ChatComposer({
  draft,
  onDraftChange,
  onSubmit,
  placeholder,
  submitLabel,
  disabled,
  className = '',
}: ChatComposerProps) {
  return (
    <form
      className={`flex shrink-0 gap-2 border-t border-border/70 bg-card/95 px-3 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-card/85 ${className}`}
      onSubmit={onSubmit}
    >
      <Input
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1"
        required
      />
      <Button type="submit" size="sm" variant="primary" disabled={disabled || !draft.trim()}>
        {submitLabel}
      </Button>
    </form>
  )
}

type ChatMessageListProps = {
  messages: ChatMessage[]
  selfId?: string | null
  empty?: ReactNode
  loading?: boolean
  footer?: ReactNode
  className?: string
}

/**
 * Scrollable message column. Virtualization deferred until threads get long enough
 * to need a windowed list library.
 */
export function ChatMessageList({
  messages,
  selfId,
  empty,
  loading,
  footer,
  className = '',
}: ChatMessageListProps) {
  const { t } = useI18n()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  return (
    <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 ${className}`}>
      {loading ? <Loading label={t('common.loading')} /> : null}
      {!loading && messages.length === 0 ? empty : null}
      {!loading && messages.length > 0 ? (
        <div className="flex flex-col gap-2">
          {messages.map((message) => (
            <ChatMessageItem key={message.id} message={message} selfId={selfId} />
          ))}
        </div>
      ) : null}
      {footer}
      <div ref={bottomRef} aria-hidden className="h-px" />
    </div>
  )
}
