import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert, Badge, Button, Input, Modal } from '@taskflow/ui'
import { Bot, Send, Sparkles, User } from 'lucide-react'

import {
  useAiSocket,
  type AiPlaceRef,
  type ProposedAgentTool,
} from '@/hooks/useAiSocket'
import { useI18n } from '@/i18n'
import { useAppDispatch } from '@/store/hooks'
import { boardsApi } from '@/services/boardsApi'
import { notificationsApi } from '@/services/notificationsApi'
import { tasksApi } from '@/services/tasksApi'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
  toolCalls?: ProposedAgentTool[]
}

type AiPlaceAgentPanelProps = {
  open: boolean
  onClose: () => void
  place: AiPlaceRef
  placeName: string
}

export function AiPlaceAgentPanel({ open, onClose, place, placeName }: AiPlaceAgentPanelProps) {
  const { t } = useI18n()
  const dispatch = useAppDispatch()
  const { connected, assistantChat, confirmAgentTools } = useAiSocket()
  const bottomRef = useRef<HTMLDivElement>(null)

  const placeLabel =
    place.type === 'board'
      ? t('ai.placeLabelBoard', { name: placeName })
      : place.type === 'space'
        ? t('ai.placeLabelSpace', { name: placeName })
        : t('ai.placeLabelWorkspace', { name: placeName })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingTools, setPendingTools] = useState<ProposedAgentTool[]>([])

  useEffect(() => {
    if (!open) return
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: connected ? t('ai.placeWelcome') : t('ai.placeWelcomeOffline'),
        suggestions: connected
          ? [
              t('ai.suggestSummarize'),
              t('ai.suggestOverdue'),
              t('ai.suggestDraftTasks'),
              t('ai.suggestComment'),
            ]
          : [],
      },
    ])
    setDraft('')
    setError(null)
    setPendingTools([])
    setBusy(false)
    setConfirming(false)
  }, [open, connected, t])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, pendingTools, open])

  function appendAssistant(partial: Omit<ChatMessage, 'id' | 'role'>) {
    setMessages((prev) => [...prev, { id: `${Date.now()}-a`, role: 'assistant', ...partial }])
  }

  async function onSend(event?: FormEvent, override?: string) {
    event?.preventDefault()
    const text = (override ?? draft).trim()
    if (!text || busy || confirming) return
    if (!connected) {
      setError(t('ai.offline'))
      return
    }

    setError(null)
    setDraft('')
    setBusy(true)
    setPendingTools([])
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: 'user', content: text }])

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))
      const reply = await assistantChat(text, history, place)
      const tools = reply.toolCalls ?? []
      appendAssistant({
        content: reply.reply,
        suggestions:
          reply.suggestions?.length > 0
            ? reply.suggestions
            : [t('ai.suggestSummarize'), t('ai.suggestDraftTasks'), t('ai.suggestOverdue')],
        toolCalls: tools.length > 0 ? tools : undefined,
      })
      setPendingTools(tools)
    } catch (err) {
      appendAssistant({
        content: err instanceof Error ? err.message : t('ai.error'),
        suggestions: [t('ai.suggestSummarize'), t('ai.suggestExplain')],
      })
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmTools() {
    if (!pendingTools.length || confirming) return
    setConfirming(true)
    setError(null)
    try {
      const { results } = await confirmAgentTools(place, pendingTools)
      const ok = results.filter((item) => item.ok)
      const failed = results.filter((item) => !item.ok)
      const lines = results.map((item) => `${item.ok ? '✓' : '✗'} ${item.message}`)
      appendAssistant({
        content: [
          failed.length === 0 ? t('ai.toolsApplied') : t('ai.toolsPartial'),
          t('ai.automationLogged'),
          '',
          ...lines,
        ].join('\n'),
        suggestions: [t('ai.suggestSummarize'), t('ai.suggestDraftTasks')],
      })
      setPendingTools([])

      if (ok.length > 0 && place.type === 'board') {
        dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: `BOARD_${place.id}` }]))
        dispatch(boardsApi.util.invalidateTags([{ type: 'Board', id: place.id }]))
      }
      dispatch(notificationsApi.util.invalidateTags([{ type: 'Notifications', id: 'LIST' }]))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.error'))
    } finally {
      setConfirming(false)
    }
  }

  function onClear() {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: connected ? t('ai.placeWelcome') : t('ai.placeWelcomeOffline'),
        suggestions: connected
          ? [
              t('ai.suggestSummarize'),
              t('ai.suggestOverdue'),
              t('ai.suggestDraftTasks'),
              t('ai.suggestComment'),
            ]
          : [],
      },
    ])
    setPendingTools([])
    setError(null)
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => {
        if (busy || confirming) return
        onClose()
      }}
      title={placeLabel}
      description={t('ai.placeSubtitle')}
      className="max-w-lg w-[min(100vw-1.5rem,32rem)]"
      closeOnOverlayClick={!busy && !confirming}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant={connected ? 'success' : 'outline'}>
            {connected ? t('ai.online') : t('ai.offline')}
          </Badge>
          <Button type="button" size="sm" variant="ghost" onClick={onClear} disabled={busy}>
            <Sparkles className="me-1.5 h-4 w-4" aria-hidden />
            {t('ai.clearChat')}
          </Button>
        </div>

        {error ? <Alert variant="error" title={error} /> : null}

        <div className="flex max-h-[min(22rem,50vh)] flex-col gap-3 overflow-y-auto rounded-md border border-border/60 p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-[92%] gap-2 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Bot className="h-3.5 w-3.5" aria-hidden />
                  )}
                </div>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.suggestions && message.suggestions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className={`rounded-md px-2 py-1 text-start text-xs transition-colors ${
                            message.role === 'user'
                              ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25'
                              : 'bg-background/80 hover:bg-background'
                          }`}
                          onClick={() => void onSend(undefined, suggestion)}
                          disabled={busy || confirming}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
          {busy ? <p className="text-xs text-muted-foreground">{t('ai.thinking')}</p> : null}
          <div ref={bottomRef} />
        </div>

        {pendingTools.length > 0 ? (
          <div className="space-y-2 rounded-md border border-border/70 bg-muted/40 p-3">
            <p className="text-xs font-medium text-muted-foreground">{t('ai.toolsPending')}</p>
            <ul className="space-y-1.5 text-sm">
              {pendingTools.map((tool) => (
                <li key={tool.id} className="rounded-md bg-background/80 px-2 py-1.5">
                  <span className="font-medium">{tool.summary}</span>
                  <span className="ms-2 text-xs text-muted-foreground">{tool.name}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={confirming || place.type !== 'board'}
                onClick={() => void onConfirmTools()}
              >
                {confirming ? t('ai.applyingTools') : t('ai.confirmTools')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={confirming}
                onClick={() => setPendingTools([])}
              >
                {t('ai.dismissTools')}
              </Button>
            </div>
            {place.type !== 'board' ? (
              <p className="text-xs text-muted-foreground">{t('ai.toolsBoardOnly')}</p>
            ) : null}
          </div>
        ) : null}

        <form className="flex items-end gap-2" onSubmit={(event) => void onSend(event)}>
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('ai.chatPlaceholderPlace')}
            disabled={busy || confirming}
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={busy || confirming || !draft.trim()}>
            <Send className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t('common.send')}</span>
          </Button>
        </form>
      </div>
    </Modal>
  )
}
