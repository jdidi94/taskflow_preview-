import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Alert, Badge, Button, Input } from '@taskflow/ui'
import { Bot, Pencil, Send, Sparkles, User, X } from 'lucide-react'

import {
  useAiSocket,
  type AiPlaceRef,
  type ProposedAgentTool,
} from '@/hooks/useAiSocket'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { reduced, softSpring } from '@/lib/motion'
import { suggestionLabel } from '@/lib/suggestionLabel'
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
  onOpenTask?: (taskId: string) => void
  /** Switch right panel to the task editor (when a card is selected). */
  onSwitchToEdit?: () => void
  canSwitchToEdit?: boolean
}

function welcomeMessage(connected: boolean, t: ReturnType<typeof useI18n>['t']): ChatMessage {
  return {
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
  }
}

export function AiPlaceAgentPanel({
  open,
  onClose,
  place,
  placeName,
  onOpenTask,
  onSwitchToEdit,
  canSwitchToEdit = false,
}: AiPlaceAgentPanelProps) {
  const { t, isRTL } = useI18n()
  const dispatch = useAppDispatch()
  const reduceMotion = useReducedMotion()
  const { connected, assistantChat, confirmAgentTools } = useAiSocket()
  const bottomRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  const closeRef = useRef<HTMLButtonElement>(null)

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
    if (open && !wasOpen.current) {
      setMessages([welcomeMessage(connected, t)])
      setDraft('')
      setError(null)
      setPendingTools([])
      setBusy(false)
      setConfirming(false)
    }
    wasOpen.current = open
  }, [open, connected, t])

  useEffect(() => {
    if (!open) return
    setMessages((prev) => {
      if (prev.length !== 1 || prev[0]?.id !== 'welcome') return prev
      return [welcomeMessage(connected, t)]
    })
  }, [connected, open, t])

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, pendingTools, open])

  useEffect(() => {
    if (!open) return
    const id = window.requestAnimationFrame(() => closeRef.current?.focus())
    return () => window.cancelAnimationFrame(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (busy || confirming) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, confirming, onClose])

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
      const suggestionChips = (reply.suggestions ?? []).map(suggestionLabel).filter(Boolean)
      appendAssistant({
        content: reply.reply,
        suggestions:
          suggestionChips.length > 0
            ? suggestionChips
            : [t('ai.suggestSummarize'), t('ai.suggestDraftTasks'), t('ai.suggestOverdue')],
        toolCalls: tools.length > 0 ? tools : undefined,
      })
      setPendingTools(tools)
    } catch (err) {
      appendAssistant({
        content: getApiErrorMessage(err, t('ai.error')),
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
        const lastTaskId = [...ok].reverse().find((item) => item.taskId)?.taskId
        if (lastTaskId && onOpenTask) onOpenTask(lastTaskId)
      }
      dispatch(notificationsApi.util.invalidateTags([{ type: 'Notifications', id: 'LIST' }]))
    } catch (err) {
      setError(getApiErrorMessage(err, t('ai.error')))
    } finally {
      setConfirming(false)
    }
  }

  function onClear() {
    setMessages([welcomeMessage(connected, t)])
    setPendingTools([])
    setError(null)
  }

  if (typeof document === 'undefined') return null

  const slideFromEnd = isRTL ? '-100%' : '100%'
  const panelMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: slideFromEnd },
        animate: { x: 0 },
        exit: { x: slideFromEnd },
      }

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="ai-agent-panel"
          className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 flex h-[min(72dvh,36rem)] max-h-[100dvh] w-full flex-col rounded-t-2xl border border-border/80 border-b-0 bg-card shadow-xl md:inset-y-0 md:inset-x-auto md:bottom-auto md:end-0 md:h-full md:max-w-md md:rounded-none md:border-0 md:border-s md:border-border"
          role="complementary"
          aria-label={placeLabel}
          initial={panelMotion.initial}
          animate={panelMotion.animate}
          exit={panelMotion.exit}
          transition={reduced(softSpring, reduceMotion)}
        >
          <div className="flex shrink-0 justify-center pb-1 pt-2.5 md:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-muted-foreground/35" />
          </div>

          <header className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3 md:px-5 md:py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">{placeLabel}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">{t('ai.placeSubtitle')}</p>
              </div>
              <Button
                ref={closeRef}
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={() => {
                  if (busy || confirming) return
                  onClose()
                }}
                disabled={busy || confirming}
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-md border border-border/70 p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={canSwitchToEdit ? 'ghost' : 'secondary'}
                  className="h-8 gap-1.5"
                  disabled={!canSwitchToEdit}
                  onClick={() => onSwitchToEdit?.()}
                  title={
                    canSwitchToEdit ? t('ai.panelToggleEdit') : t('ai.panelToggleEditDisabled')
                  }
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                  {t('ai.panelToggleEdit')}
                </Button>
                <Button type="button" size="sm" variant="secondary" className="h-8 gap-1.5" disabled>
                  <Bot className="h-3.5 w-3.5" aria-hidden />
                  {t('ai.panelToggleAi')}
                </Button>
              </div>
              <Badge variant={connected ? 'success' : 'outline'}>
                {connected ? t('ai.online') : t('ai.offline')}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="ms-auto"
                onClick={onClear}
                disabled={busy}
              >
                <Sparkles className="me-1.5 h-4 w-4" aria-hidden />
                {t('ai.clearChat')}
              </Button>
            </div>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 md:p-5">
            {error ? <Alert variant="error" title={error} /> : null}

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-md border border-border/60 p-3">
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
                          {message.suggestions.map((suggestion, index) => {
                            const label = suggestionLabel(suggestion)
                            if (!label) return null
                            return (
                              <button
                                key={`${label}-${index}`}
                                type="button"
                                className={`rounded-md px-2 py-1 text-start text-xs transition-colors ${
                                  message.role === 'user'
                                    ? 'bg-primary-foreground/15 hover:bg-primary-foreground/25'
                                    : 'bg-background/80 hover:bg-background'
                                }`}
                                onClick={() => void onSend(undefined, label)}
                                disabled={busy || confirming}
                              >
                                {label}
                              </button>
                            )
                          })}
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
              <div className="shrink-0 space-y-2 rounded-md border border-border/70 bg-muted/40 p-3">
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

            <form
              className="flex shrink-0 items-end gap-2"
              onSubmit={(event) => void onSend(event)}
            >
              <Input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t('ai.chatPlaceholderPlace')}
                disabled={busy || confirming}
                className="flex-1"
              />
              <Button
                type="submit"
                variant="primary"
                disabled={busy || confirming || !draft.trim()}
              >
                <Send className="h-4 w-4" aria-hidden />
                <span className="sr-only">{t('common.send')}</span>
              </Button>
            </form>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
