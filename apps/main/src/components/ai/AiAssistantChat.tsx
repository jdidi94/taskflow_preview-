import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Badge, Button, Card, CardContent, Input, Loading } from '@taskflow/ui'
import { Bot, Send, Sparkles, User } from 'lucide-react'

import { useAiSocket, type GeneratedBoard } from '@/hooks/useAiSocket'
import { useI18n } from '@/i18n'
import { useCreateBoardMutation, useGetBoardQuery } from '@/services/boardsApi'
import { useListByWorkspaceQuery } from '@/services/spacesApi'
import { useCreateTaskMutation } from '@/services/tasksApi'
import { useListWorkspacesQuery } from '@/services/workspacesApi'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  suggestions?: string[]
  boardPreview?: GeneratedBoard | null
  generatingBoard?: boolean
}

function formatSuggestionsBlock(
  title: string,
  lines: string[],
): string {
  if (!lines.length) return ''
  return `\n\n${title}\n${lines.map((line, index) => `${index + 1}. ${line}`).join('\n')}`
}

export function AiAssistantChat() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { connected, assistantChat, generateBoard, getSmartSuggestions, getQuickTemplates } =
    useAiSocket()
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: workspacesData, isLoading: loadingWorkspaces } = useListWorkspacesQuery()
  const workspaces = workspacesData?.data ?? []
  const firstWorkspaceId = workspaces[0]?.id ?? ''
  const { data: spacesData } = useListByWorkspaceQuery(firstWorkspaceId, { skip: !firstWorkspaceId })
  const spaces = spacesData?.data ?? []

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [spaceId, setSpaceId] = useState('')
  const [pendingPreview, setPendingPreview] = useState<GeneratedBoard | null>(null)
  const [createBoard, { isLoading: creatingBoard }] = useCreateBoardMutation()
  const [createTask] = useCreateTaskMutation()
  const [createdBoardId, setCreatedBoardId] = useState<string | null>(null)
  const { data: createdBoardData } = useGetBoardQuery(createdBoardId ?? '', { skip: !createdBoardId })

  useEffect(() => {
    if (!spaceId && spaces[0]?.id) setSpaceId(spaces[0].id)
  }, [spaceId, spaces])

  useEffect(() => {
    if (messages.length > 0) return
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: connected ? t('ai.welcome') : t('ai.welcomeOffline'),
        suggestions: connected
          ? [
              t('ai.suggestMarketing'),
              t('ai.suggestDev'),
              t('ai.suggestExplain'),
              t('ai.suggestTemplates'),
            ]
          : [],
      },
    ])
  }, [connected, messages.length, t])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    async function seedTasks() {
      if (!createdBoardId || !createdBoardData?.data || !pendingPreview?.tasks?.length) {
        if (createdBoardId && createdBoardData?.data) {
          navigate(`/boards/${createdBoardId}`, { replace: true })
        }
        return
      }
      const columns = createdBoardData.data.columns ?? []
      const fallbackColumn = columns[0]?.id
      if (!fallbackColumn) {
        navigate(`/boards/${createdBoardId}`, { replace: true })
        return
      }

      for (const task of pendingPreview.tasks.slice(0, 20)) {
        const match =
          columns.find(
            (column) =>
              column.name.toLowerCase() === String(task.column ?? '').toLowerCase(),
          ) ?? columns[0]
        try {
          await createTask({
            boardId: createdBoardId,
            columnId: match?.id ?? fallbackColumn,
            title: String(task.title ?? 'Task'),
            description: task.description,
            priority:
              task.priority === 'low' ||
              task.priority === 'medium' ||
              task.priority === 'high' ||
              task.priority === 'critical'
                ? task.priority
                : 'medium',
          }).unwrap()
        } catch {
          // continue seeding
        }
      }
      navigate(`/boards/${createdBoardId}`, { replace: true })
    }

    void seedTasks()
  }, [createdBoardId, createdBoardData, pendingPreview, createTask, navigate])

  function appendAssistant(partial: Omit<ChatMessage, 'id' | 'role'>) {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-a`, role: 'assistant', ...partial },
    ])
  }

  async function runIntentExtras(
    intent:
      | 'none'
      | 'generate_board'
      | 'templates'
      | 'suggestions'
      | 'summarize'
      | 'draft'
      | 'tools',
    userText: string,
    boardPrompt: string | null,
    baseReply: string,
    baseSuggestions: string[],
  ) {
    let content = baseReply
    let boardPreview: GeneratedBoard | null = null
    let suggestions = baseSuggestions

    if (intent === 'templates') {
      try {
        const templates = await getQuickTemplates('general')
        const lines = (Array.isArray(templates) ? templates : [])
          .slice(0, 5)
          .map((item) => `${item.name ?? 'Template'}: ${item.description ?? ''}`)
        content += formatSuggestionsBlock(t('ai.templatesHeading'), lines)
        suggestions = [
          t('ai.suggestMarketing'),
          t('ai.suggestDev'),
          ...(templates[0]?.name ? [`Create a board like ${templates[0].name}`] : []),
        ].slice(0, 4)
      } catch {
        // keep base reply
      }
    }

    if (intent === 'suggestions') {
      try {
        const smart = await getSmartSuggestions(userText)
        const lines = [
          ...(smart.suggestions ?? []).slice(0, 3),
          ...(smart.boardTypes ?? []).slice(0, 2).map(
            (item) => `${item.name ?? item.type}: ${item.description ?? ''}`,
          ),
          ...(smart.templates ?? []).slice(0, 2).map(
            (item) => `${item.name}: ${item.description ?? ''}`,
          ),
        ].filter(Boolean)
        content += formatSuggestionsBlock(t('ai.ideasHeading'), lines)
      } catch {
        // keep base reply
      }
    }

    if (intent === 'generate_board') {
      const prompt = boardPrompt || userText
      appendAssistant({
        content: baseReply,
        suggestions: [],
        generatingBoard: true,
      })
      try {
        boardPreview = await generateBoard(prompt)
        const name = boardPreview.board?.name || prompt.slice(0, 48)
        const columns = (boardPreview.columns ?? []).map((c) => c.name).filter(Boolean).join(' · ')
        content = `${baseReply}\n\n${t('ai.boardReady', { name })}\n${columns}`
        suggestions = [t('ai.suggestAnother'), t('ai.suggestImprove'), t('ai.suggestTemplates')]
        setPendingPreview(boardPreview)
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.generatingBoard) {
            next[next.length - 1] = {
              ...last,
              content,
              suggestions,
              boardPreview,
              generatingBoard: false,
            }
            return next
          }
          return [
            ...next,
            {
              id: `${Date.now()}-board`,
              role: 'assistant',
              content,
              suggestions,
              boardPreview,
            },
          ]
        })
        return
      } catch (err) {
        setMessages((prev) => {
          const next = [...prev]
          const last = next[next.length - 1]
          if (last?.generatingBoard) {
            next[next.length - 1] = {
              ...last,
              content: err instanceof Error ? err.message : t('ai.error'),
              generatingBoard: false,
              suggestions: [t('ai.suggestMarketing'), t('ai.suggestDev')],
            }
          }
          return next
        })
        return
      }
    }

    appendAssistant({ content, suggestions, boardPreview })
  }

  async function onSend(event?: FormEvent, override?: string) {
    event?.preventDefault()
    const text = (override ?? draft).trim()
    if (!text || busy) return
    if (!connected) {
      setError(t('ai.offline'))
      return
    }

    setError(null)
    setDraft('')
    setBusy(true)
    setMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: 'user', content: text }])

    try {
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({ role: m.role, content: m.content }))
      const reply = await assistantChat(text, history)
      await runIntentExtras(
        reply.intent,
        text,
        reply.boardPrompt,
        reply.reply,
        reply.suggestions?.length
          ? reply.suggestions
          : [t('ai.suggestMarketing'), t('ai.suggestDev'), t('ai.suggestTemplates')],
      )
    } catch (err) {
      appendAssistant({
        content: err instanceof Error ? err.message : t('ai.error'),
        suggestions: [t('ai.suggestMarketing'), t('ai.suggestExplain')],
      })
    } finally {
      setBusy(false)
    }
  }

  async function onCreateBoard(preview: GeneratedBoard) {
    if (!spaceId) {
      setError(t('ai.noSpaces'))
      return
    }
    setError(null)
    setPendingPreview(preview)
    try {
      const board = await createBoard({
        spaceId,
        name: String(preview.board?.name || t('ai.preview')),
        description: preview.board?.description,
      }).unwrap()
      setCreatedBoardId(board.data.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('ai.error'))
    }
  }

  function onClear() {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: connected ? t('ai.welcome') : t('ai.welcomeOffline'),
        suggestions: connected
          ? [
              t('ai.suggestMarketing'),
              t('ai.suggestDev'),
              t('ai.suggestExplain'),
              t('ai.suggestTemplates'),
            ]
          : [],
      },
    ])
    setPendingPreview(null)
    setError(null)
  }

  if (loadingWorkspaces) return <Loading label={t('common.loading')} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={connected ? 'success' : 'outline'}>
          {connected ? t('ai.online') : t('ai.offline')}
        </Badge>
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          <Sparkles className="me-1.5 h-4 w-4" aria-hidden />
          {t('ai.clearChat')}
        </Button>
      </div>

      {spaces.length === 0 ? <Alert variant="info" title={t('ai.noSpaces')} /> : null}
      {error ? <Alert variant="error" title={error} /> : null}

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-0 p-0">
          <div className="flex max-h-[min(28rem,55vh)] flex-col gap-4 overflow-y-auto p-4 sm:p-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[92%] gap-2 sm:max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" aria-hidden />
                    ) : (
                      <Bot className="h-4 w-4" aria-hidden />
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
                    {message.generatingBoard ? (
                      <p className="mt-2 text-xs opacity-80">{t('ai.generating')}</p>
                    ) : null}
                    {message.boardPreview ? (
                      <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-background/80 p-3 text-foreground">
                        <p className="text-xs text-muted-foreground">{t('ai.preview')}</p>
                        <p className="font-medium">{message.boardPreview.board?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {message.boardPreview.board?.description}
                        </p>
                        <ul className="list-disc space-y-1 ps-4 text-xs text-muted-foreground">
                          {(message.boardPreview.tasks ?? []).slice(0, 6).map((task, index) => (
                            <li key={`${task.title}-${index}`}>{task.title}</li>
                          ))}
                        </ul>
                        <label className="flex flex-col gap-1 text-xs">
                          <span className="font-medium">{t('ai.spaceLabel')}</span>
                          <select
                            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                            value={spaceId}
                            onChange={(e) => setSpaceId(e.target.value)}
                            disabled={!spaces.length}
                          >
                            {spaces.map((space) => (
                              <option key={space.id} value={space.id}>
                                {space.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="primary"
                          disabled={creatingBoard || !spaceId}
                          onClick={() => void onCreateBoard(message.boardPreview!)}
                        >
                          {creatingBoard ? t('ai.creating') : t('ai.confirm')}
                        </Button>
                      </div>
                    ) : null}
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
                            disabled={busy}
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
            {busy && !messages.some((m) => m.generatingBoard) ? (
              <p className="text-xs text-muted-foreground">{t('ai.thinking')}</p>
            ) : null}
            <div ref={bottomRef} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-border/70 p-3 sm:p-4"
            onSubmit={(event) => void onSend(event)}
          >
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t('ai.chatPlaceholder')}
              disabled={busy}
              className="flex-1"
            />
            <Button type="submit" variant="primary" disabled={busy || !draft.trim()}>
              <Send className="h-4 w-4" aria-hidden />
              <span className="sr-only">{t('common.send')}</span>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
