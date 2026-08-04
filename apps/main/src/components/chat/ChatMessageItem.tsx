import { Badge } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { ChatMessage } from '@/types/chat'

type Props = {
  message: ChatMessage
  selfId?: string | null
}

export function ChatMessageItem({ message, selfId }: Props) {
  const { t } = useI18n()
  const isSelf = Boolean(selfId && message.sender?.id && message.sender.id === selfId)
  const isAdmin = message.sender?.model === 'Admin'

  return (
    <div className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm sm:max-w-[70%] ${
          isSelf ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2 text-xs opacity-80">
          <span>{message.sender?.name ?? (isAdmin ? 'Support' : t('common.name'))}</span>
          {isAdmin ? <Badge variant="secondary">Support</Badge> : null}
        </div>
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    </div>
  )
}
