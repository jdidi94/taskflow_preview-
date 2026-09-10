import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Card, CardContent, Input } from '@taskflow/ui'

import { ChatComposer, ChatMessageList } from '@/components/chat/ChatThread'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useChatSocket } from '@/hooks/useChatSocket'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  clearStoredChatId,
  getStoredChatId,
  useGetChatHistoryQuery,
  useSendChatMessageMutation,
  useStartChatMutation,
} from '@/services/chatApi'
import { useAppSelector } from '@/store/hooks'

export function ChatPanel() {
  const { t } = useI18n()
  const user = useAppSelector((state) => state.auth.user)
  const [chatId, setChatId] = useState<string | null>(() => getStoredChatId())
  const [draft, setDraft] = useState('')
  const [historyQuery, setHistoryQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [startChat, { isLoading: starting }] = useStartChatMutation()
  const [sendMessage, { isLoading: sending }] = useSendChatMessageMutation()
  const { data, isLoading, isError } = useGetChatHistoryQuery(chatId ?? '', { skip: !chatId })
  const { connected } = useChatSocket(chatId ?? undefined)

  const messages = data?.data.messages ?? []
  const filteredMessages = useMemo(() => {
    const q = historyQuery.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((message) => message.content.toLowerCase().includes(q))
  }, [historyQuery, messages])
  const busy = starting || sending

  function startNewConversation() {
    clearStoredChatId()
    setChatId(null)
    setDraft('')
    setHistoryQuery('')
    setError(null)
  }

  useEffect(() => {
    const stored = getStoredChatId()
    if (stored && stored !== chatId) setChatId(stored)
  }, [chatId])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draft.trim()) return
    setError(null)
    try {
      if (!chatId) {
        const result = await startChat({ message: draft.trim() }).unwrap()
        setChatId(result.data.chat.id)
      } else {
        await sendMessage({ chatId, content: draft.trim() }).unwrap()
      }
      setDraft('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('chat.sendError')))
    }
  }

  const submitLabel = chatId
    ? sending
      ? t('common.loading')
      : t('common.send')
    : starting
      ? t('chat.starting')
      : t('chat.start')

  return (
    <div className="flex flex-col gap-6">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('common.chat') },
          ]}
        />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {t('chat.title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('chat.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={connected ? 'success' : 'outline'}>
              {connected ? t('chat.connected') : t('chat.reconnecting')}
            </Badge>
            <Button type="button" size="sm" variant="outline" onClick={startNewConversation}>
              {t('chat.newConversation')}
            </Button>
          </div>
        </div>
      </section>

      {error ? <Alert variant="error" title={t('chat.sendError')} description={error} /> : null}
      {isError ? <Alert variant="error" title={t('chat.loadError')} /> : null}

      <Card className="overflow-hidden border-border/70">
        <CardContent className="flex h-[min(70vh,36rem)] flex-col gap-0 p-0">
          <div className="border-b border-border/60 px-4 py-2">
            <label className="sr-only" htmlFor="chat-history-search">
              {t('chat.searchHistory')}
            </label>
            <Input
              id="chat-history-search"
              value={historyQuery}
              onChange={(event) => setHistoryQuery(event.target.value)}
              placeholder={t('chat.searchPlaceholder')}
            />
          </div>
          <ChatMessageList
            messages={filteredMessages}
            selfId={user?.id}
            loading={Boolean(chatId && isLoading)}
            empty={
              <p className="text-sm text-muted-foreground">
                {historyQuery.trim() ? t('chat.noHistoryMatch') : t('chat.empty')}
              </p>
            }
            className="px-4"
          />
          <ChatComposer
            draft={draft}
            onDraftChange={setDraft}
            onSubmit={(event) => void onSubmit(event)}
            placeholder={chatId ? t('chat.messagePlaceholder') : t('chat.startPlaceholder')}
            submitLabel={submitLabel}
            disabled={busy}
            className="sticky bottom-0 z-[1] px-4"
          />
        </CardContent>
      </Card>
    </div>
  )
}
