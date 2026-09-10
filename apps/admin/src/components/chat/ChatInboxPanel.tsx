import { useMemo, useRef, useState } from 'react'
import { Alert, Badge, Button } from '@taskflow/ui'

import { ChatConversation } from '@/components/chat/ChatConversation'
import { ChatThreadList } from '@/components/chat/ChatThreadList'
import { PageHeader } from '@/components/common/PageHeader'
import { useToast } from '@/components/common/ToastProvider'
import { useChatInboxSocket } from '@/hooks/useChatInboxSocket'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useAcceptChatMutation,
  useCloseChatMutation,
  useGetChatStatsQuery,
  useLazyGetChatHistoryQuery,
  useListActiveChatsQuery,
  useMarkChatReadMutation,
  useSendChatMessageMutation,
  useUpdateChatStatusMutation,
} from '@/services/adminChatApi'
import {
  chatDocId,
  customerOf,
  messageId,
  participantId,
  type ChatMessage,
  type ChatStatus,
  type NewChatRequestPayload,
  type SupportChat,
} from '@/types/chat'

export function ChatInboxPanel() {
  const { t } = useI18n()
  const toast = useToast()
  const chatsQuery = useListActiveChatsQuery(undefined, { pollingInterval: 45_000 })
  const statsQuery = useGetChatStatsQuery(undefined, { pollingInterval: 45_000 })
  const [loadHistory] = useLazyGetChatHistoryQuery()
  const [acceptChat, { isLoading: accepting }] = useAcceptChatMutation()
  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation()
  const [updateStatus] = useUpdateChatStatusMutation()
  const [closeChat] = useCloseChatMutation()
  const [markRead] = useMarkChatReadMutation()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [extras, setExtras] = useState<SupportChat[]>([])
  const [patches, setPatches] = useState<Record<string, Partial<SupportChat>>>({})
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({})
  const [typingByChat, setTypingByChat] = useState<Record<string, string | null>>({})
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const typingTimeout = useRef<number | null>(null)
  const joinedRooms = useRef(new Set<string>())

  const remoteChats = chatsQuery.data?.data.chats ?? []
  const chats = useMemo(() => mergeChats(remoteChats, extras, patches), [extras, patches, remoteChats])
  const selected = chats.find((chat) => chatDocId(chat) === selectedId) ?? null
  const messages = selectedId ? (messagesByChat[selectedId] ?? []) : []
  const stats = statsQuery.data?.data.stats
  const filtered = chats.filter((chat) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    const customer = customerOf(chat)
    return (
      (customer?.name ?? '').toLowerCase().includes(q) ||
      (customer?.email ?? '').toLowerCase().includes(q) ||
      (chat.lastMessage?.content ?? '').toLowerCase().includes(q) ||
      (chat.chatId ?? '').toLowerCase().includes(q)
    )
  })

  const socket = useChatInboxSocket({
    onNewRequest(payload) {
      setExtras((prev) => upsertChat(prev, chatFromRequest(payload)))
      toast.show({ message: t('chat.newRequest', { name: payload.user.name }) })
      void chatsQuery.refetch()
      void statsQuery.refetch()
    },
    onMessage(chatId, message) {
      setMessagesByChat((prev) => appendMessage(prev, chatId, message))
      setPatches((prev) => ({
        ...prev,
        [chatId]: {
          ...prev[chatId],
          lastMessage: {
            content: message.content,
            timestamp: message.createdAt,
            sender: { name: message.sender.name },
          },
          updatedAt: message.createdAt,
        },
      }))
    },
    onStatus(chatId, status) {
      setPatches((prev) => ({ ...prev, [chatId]: { ...prev[chatId], status } }))
    },
    onClosed(chatId) {
      setPatches((prev) => ({ ...prev, [chatId]: { ...prev[chatId], status: 'closed' } }))
      if (selectedId === chatId) {
        setSelectedId(null)
        setDraft('')
      }
    },
    onAccepted(chatId) {
      setPatches((prev) => ({ ...prev, [chatId]: { ...prev[chatId], status: 'active' } }))
    },
    onTyping(chatId, userId, isTyping) {
      setTypingByChat((prev) => ({ ...prev, [chatId]: isTyping ? userId : null }))
    },
    onPresence() {
      void chatsQuery.refetch()
    },
  })

  async function selectChat(chat: SupportChat) {
    const id = chatDocId(chat)
    setSelectedId(id)
    setError(null)
    if (!joinedRooms.current.has(id)) {
      socket.joinChat(id)
      joinedRooms.current.add(id)
    }
    try {
      const result = await loadHistory(id).unwrap()
      const history = result.data.messages ?? []
      setMessagesByChat((prev) => ({ ...prev, [id]: history }))
      const unread = history.filter((message) => !message.isRead && message.sender.model === 'User').map(messageId)
      if (unread.length > 0) {
        await markRead({ chatId: id, messageIds: unread })
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.loadError')))
    }
  }

  async function handleAccept(chatId: string) {
    setAcceptingId(chatId)
    try {
      await acceptChat(chatId).unwrap()
      socket.joinChat(chatId)
      joinedRooms.current.add(chatId)
      const chat = chats.find((item) => chatDocId(item) === chatId)
      if (chat) await selectChat({ ...chat, status: 'active' })
      toast.show({ message: t('chat.acceptedOk') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.acceptError')))
    } finally {
      setAcceptingId(null)
    }
  }

  async function handleSend() {
    if (!selected || !draft.trim() || selected.status === 'closed') return
    const id = chatDocId(selected)
    try {
      const result = await sendMessage({ chatId: id, content: draft.trim() }).unwrap()
      setMessagesByChat((prev) => appendMessage(prev, id, result.data.message))
      setDraft('')
      socket.sendTyping(id, false)
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.sendError')))
    }
  }

  function handleDraftChange(value: string) {
    setDraft(value)
    if (!selected) return
    const id = chatDocId(selected)
    socket.sendTyping(id, true)
    if (typingTimeout.current) window.clearTimeout(typingTimeout.current)
    typingTimeout.current = window.setTimeout(() => socket.sendTyping(id, false), 1000)
  }

  async function handleStatus(status: ChatStatus) {
    if (!selected) return
    const id = chatDocId(selected)
    try {
      await updateStatus({ chatId: id, status }).unwrap()
      setPatches((prev) => ({ ...prev, [id]: { ...prev[id], status } }))
      toast.show({ message: t('chat.statusOk') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.saveError')))
    }
  }

  async function handleClose() {
    if (!selected) return
    const id = chatDocId(selected)
    try {
      await closeChat({ chatId: id, reason: t('chat.closedByAdmin') }).unwrap()
      socket.leaveChat(id)
      joinedRooms.current.delete(id)
      setSelectedId(null)
      setDraft('')
      toast.show({ message: t('chat.closedOk') })
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.saveError')))
    }
  }

  const selectedCustomerId = selected ? participantId(customerOf(selected) ?? { model: 'User', id: '' }) : ''
  const customerTyping = Boolean(selected && selectedCustomerId && typingByChat[chatDocId(selected)] === selectedCustomerId)

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title={t('chat.title')}
        subtitle={t('chat.subtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={socket.tone === 'live' ? 'success' : socket.tone === 'offline' ? 'error' : 'warning'}>
              {socket.tone === 'live'
                ? t('chat.connected')
                : socket.tone === 'offline'
                  ? t('chat.disconnected')
                  : t('chat.reconnecting')}
            </Badge>
            <Badge variant="secondary">
              {t('chat.pendingCount', { count: stats?.pendingChats ?? 0 })}
            </Badge>
            {socket.tone !== 'live' ? (
              <Button size="sm" variant="outline" onClick={socket.reconnect}>
                {t('common.retry')}
              </Button>
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="error" title={error} className="mb-3" /> : null}
      {chatsQuery.isError ? <Alert variant="error" title={t('chat.loadError')} className="mb-3" /> : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/70 bg-card md:flex-row">
        <ChatThreadList
          chats={filtered}
          selectedId={selectedId}
          loading={chatsQuery.isLoading}
          search={search}
          onSearch={setSearch}
          onRefresh={() => {
            void chatsQuery.refetch()
            void statsQuery.refetch()
          }}
          onSelect={(chat) => void selectChat(chat)}
          onAccept={(chatId) => void handleAccept(chatId)}
          acceptingId={accepting ? acceptingId : null}
        />
        <ChatConversation
          chat={selected}
          messages={messages}
          draft={draft}
          typing={customerTyping}
          onDraftChange={handleDraftChange}
          onSend={() => void handleSend()}
          onStatusChange={(status) => void handleStatus(status)}
          onClose={() => void handleClose()}
          sending={sending}
        />
      </div>
    </div>
  )
}

function mergeChats(
  remote: SupportChat[],
  extras: SupportChat[],
  patches: Record<string, Partial<SupportChat>>,
) {
  const patchedRemote = remote.map((chat) => {
    const id = chatDocId(chat)
    return { ...chat, ...patches[id], _id: id, id }
  })
  const known = new Set(patchedRemote.map(chatDocId))
  const extra = extras
    .filter((chat) => !known.has(chatDocId(chat)))
    .map((chat) => {
      const id = chatDocId(chat)
      return { ...chat, ...patches[id], _id: id, id }
    })
  return [...extra, ...patchedRemote].sort((a, b) => {
    const aTime = new Date(a.updatedAt ?? a.createdAt).getTime()
    const bTime = new Date(b.updatedAt ?? b.createdAt).getTime()
    return bTime - aTime
  })
}

function upsertChat(list: SupportChat[], next: SupportChat) {
  const id = chatDocId(next)
  const exists = list.some((chat) => chatDocId(chat) === id)
  return exists ? list.map((chat) => (chatDocId(chat) === id ? { ...chat, ...next } : chat)) : [next, ...list]
}

function appendMessage(map: Record<string, ChatMessage[]>, chatId: string, message: ChatMessage) {
  const current = map[chatId] ?? []
  const id = messageId(message)
  if (id && current.some((item) => messageId(item) === id)) return map
  return { ...map, [chatId]: [...current, message] }
}

function chatFromRequest(payload: NewChatRequestPayload): SupportChat {
  const id = String(payload.chatId)
  const now = payload.timestamp ? String(payload.timestamp) : new Date().toISOString()
  return {
    _id: id,
    id,
    chatId: id,
    status: 'pending',
    priority: payload.priority || 'medium',
    category: payload.category || 'general',
    createdAt: now,
    updatedAt: now,
    participants: [
      {
        id: String(payload.user.id ?? payload.user._id ?? ''),
        name: payload.user.name,
        email: payload.user.email,
        model: 'User',
      },
    ],
    lastMessage: {
      content: payload.message,
      timestamp: now,
      sender: { name: payload.user.name },
    },
  }
}
