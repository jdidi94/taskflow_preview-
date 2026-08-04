export type ChatMessage = {
  id: string
  content: string
  isRead?: boolean
  createdAt?: string
  sender?: {
    id?: string
    name?: string
    model?: 'User' | 'Admin'
  }
}

export type ChatThread = {
  id: string
  chatId?: string
  status?: string
  messages: ChatMessage[]
}

export function normalizeChatMessage(raw: Record<string, unknown>): ChatMessage {
  const sender = (raw.sender as Record<string, unknown> | undefined) ?? undefined
  return {
    id: String(raw.id ?? raw._id ?? crypto.randomUUID()),
    content: String(raw.content ?? ''),
    isRead: Boolean(raw.isRead),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    sender: sender
      ? {
          id: sender.id ? String(sender.id) : undefined,
          name: sender.name ? String(sender.name) : undefined,
          model: sender.model as 'User' | 'Admin' | undefined,
        }
      : undefined,
  }
}

export function normalizeChat(raw: Record<string, unknown>): ChatThread {
  const messages = Array.isArray(raw.messages)
    ? raw.messages.map((item) => normalizeChatMessage(item as Record<string, unknown>))
    : []
  return {
    id: String(raw.id ?? raw._id ?? ''),
    chatId: raw.chatId ? String(raw.chatId) : undefined,
    status: raw.status ? String(raw.status) : undefined,
    messages,
  }
}
