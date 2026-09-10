import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Input } from '@taskflow/ui'
import { Bot, LayoutTemplate, Sparkles } from 'lucide-react'

import { persistGeneratedBoard, type GeneratedBoardPreview } from '@/components/onboarding/persistGeneratedBoard'
import { seedSampleBoard } from '@/components/onboarding/seedSampleBoard'
import { useI18n } from '@/i18n'
import { getAiSocket } from '@/lib/socket'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useCreateBoardMutation,
  useCreateColumnMutation,
  useLazyGetBoardQuery,
} from '@/services/boardsApi'
import { useCreateInvitationMutation } from '@/services/invitationsApi'
import { useCreateSpaceMutation } from '@/services/spacesApi'
import { useCreateTaskMutation } from '@/services/tasksApi'
import { useListTemplatesQuery } from '@/services/templatesApi'
import { extractTemplateLists } from '@/services/templatesApi'
import { useCreateWorkspaceMutation, useListWorkspacesQuery } from '@/services/workspacesApi'

type Step = 'workspace' | 'invite' | 'starter'

export function OnboardingWizard() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: workspacesData } = useListWorkspacesQuery()
  const workspaces = workspacesData?.data ?? []
  const [createWorkspace, { isLoading: creatingWorkspace }] = useCreateWorkspaceMutation()
  const [createInvitation, { isLoading: inviting }] = useCreateInvitationMutation()
  const [createSpace] = useCreateSpaceMutation()
  const [createBoard] = useCreateBoardMutation()
  const [createColumn] = useCreateColumnMutation()
  const [createTask] = useCreateTaskMutation()
  const [fetchBoard] = useLazyGetBoardQuery()
  const { data: templatesData } = useListTemplatesQuery({ type: 'board' })
  const templates = (templatesData?.data ?? []).filter((item) => item.type === 'board' || item.type === 'workflow')

  const [step, setStep] = useState<Step>('workspace')
  const [workspaceId, setWorkspaceId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiPreview, setAiPreview] = useState<GeneratedBoardPreview | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)

  useEffect(() => {
    if (workspaceId || workspaces.length === 0) return
    setWorkspaceId(workspaces[0].id)
    setStep((current) => (current === 'workspace' ? 'invite' : current))
  }, [workspaceId, workspaces])

  async function onCreateWorkspace(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const created = await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap()
      setWorkspaceId(created.data.id)
      setStep('invite')
    } catch (err) {
      setError(getApiErrorMessage(err, t('onboarding.error')))
    }
  }

  async function onInvite(event: FormEvent) {
    event.preventDefault()
    if (!workspaceId || !inviteEmail.trim()) return
    setError(null)
    setInviteStatus(null)
    try {
      await createInvitation({
        type: 'workspace',
        email: inviteEmail.trim(),
        targetEntityId: workspaceId,
        role: 'member',
      }).unwrap()
      setInviteStatus(t('invites.sent'))
      setInviteEmail('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('invites.sendError')))
    }
  }

  async function finishWithSample() {
    if (!workspaceId) return
    setBusy(true)
    setError(null)
    try {
      const boardId = await seedSampleBoard({
        workspaceId,
        t: t as never,
        createSpace,
        createBoard,
        createTask,
      })
      navigate(`/boards/${boardId}`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('onboarding.error')))
      setBusy(false)
    }
  }

  async function finishWithTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    if (!template || !workspaceId) return
    setBusy(true)
    setError(null)
    try {
      const space = await createSpace({
        workspaceId,
        name: template.name,
        description: template.description,
      }).unwrap()
      const board = await createBoard({
        spaceId: space.data.id,
        name: template.name,
        description: template.description,
      }).unwrap()
      const lists = extractTemplateLists(template.content)
      if (lists.length > 0) {
        const existing = board.data.columns ?? []
        const existingNames = new Set(existing.map((column) => column.name.toLowerCase()))
        for (const list of lists) {
          if (existingNames.has(list.name.toLowerCase())) continue
          await createColumn({ boardId: board.data.id, name: list.name }).unwrap()
        }
      }
      navigate(`/boards/${board.data.id}`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('onboarding.error')))
      setBusy(false)
    }
  }

  function generateAi(event: FormEvent) {
    event.preventDefault()
    if (!aiPrompt.trim()) return
    setError(null)
    setAiPreview(null)
    setAiGenerating(true)
    try {
      const socket = getAiSocket()
      const onDone = (payload: { data?: GeneratedBoardPreview }) => {
        setAiGenerating(false)
        socket.off('board_generated', onDone)
        socket.off('board_generation_error', onFail)
        if (payload?.data) setAiPreview(payload.data)
        else setError(t('ai.error'))
      }
      const onFail = (payload: { error?: string; details?: string }) => {
        setAiGenerating(false)
        socket.off('board_generated', onDone)
        socket.off('board_generation_error', onFail)
        setError(payload?.error || payload?.details || t('ai.error'))
      }
      socket.on('board_generated', onDone)
      socket.on('board_generation_error', onFail)
      socket.emit('generate_board', { prompt: aiPrompt.trim() })
    } catch (err) {
      setAiGenerating(false)
      setError(getApiErrorMessage(err, t('ai.error')))
    }
  }

  async function confirmAiBoard() {
    if (!workspaceId || !aiPreview) return
    setBusy(true)
    setError(null)
    try {
      const space = await createSpace({
        workspaceId,
        name: String(aiPreview.board?.name || aiPrompt.slice(0, 40) || t('onboarding.sampleSpaceName')),
      }).unwrap()
      const boardId = await persistGeneratedBoard({
        spaceId: space.data.id,
        preview: aiPreview,
        fallbackName: aiPrompt.slice(0, 40) || t('onboarding.sampleBoardName'),
        createBoard,
        createColumn,
        getBoard: async (id) => {
          const result = await fetchBoard(id).unwrap()
          return result.data
        },
        createTask,
      })
      navigate(`/boards/${boardId}`, { replace: true })
    } catch (err) {
      setError(getApiErrorMessage(err, t('onboarding.error')))
      setBusy(false)
    }
  }

  const steps: Array<{ id: Step; label: string }> = [
    { id: 'workspace', label: t('onboarding.stepWorkspace') },
    { id: 'invite', label: t('onboarding.stepInvite') },
    { id: 'starter', label: t('onboarding.stepStarter') },
  ]

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('onboarding.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('onboarding.subtitle')}</p>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {steps.map((item, index) => (
          <li
            key={item.id}
            className={step === item.id ? 'text-primary' : undefined}
            aria-current={step === item.id ? 'step' : undefined}
          >
            {index + 1}. {item.label}
          </li>
        ))}
      </ol>

      {error ? <Alert variant="error" title={t('onboarding.error')} description={error} /> : null}

      {step === 'workspace' ? (
        <form className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/40 p-5" onSubmit={(event) => void onCreateWorkspace(event)}>
          <h2 className="text-lg font-semibold">{t('onboarding.workspaceTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('onboarding.workspaceSubtitle')}</p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('common.name')}</span>
            <Input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('dashboard.description')}</span>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <Button type="submit" variant="primary" disabled={creatingWorkspace}>
            {creatingWorkspace ? t('dashboard.creating') : t('onboarding.continue')}
          </Button>
        </form>
      ) : null}

      {step === 'invite' ? (
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card/40 p-5">
          <div>
            <h2 className="text-lg font-semibold">{t('onboarding.inviteTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.inviteSubtitle')}</p>
          </div>
          {inviteStatus ? <Alert variant="success" title={inviteStatus} /> : null}
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => void onInvite(event)}>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('invites.email')}</span>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </label>
            <Button type="submit" variant="outline" disabled={inviting || !workspaceId}>
              {inviting ? t('invites.sending') : t('invites.send')}
            </Button>
          </form>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={() => setStep('starter')}>
              {t('onboarding.continue')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setStep('starter')}>
              {t('onboarding.inviteSkip')}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'starter' ? (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t('onboarding.starterTitle')}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.starterSubtitle')}</p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void finishWithSample()}
            className="rounded-xl border border-border/70 bg-card/40 p-4 text-start hover:border-primary/40"
          >
            <span className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden />
              {t('onboarding.sampleTitle')}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">{t('onboarding.sampleBody')}</span>
          </button>

          <div className="rounded-xl border border-border/70 bg-card/40 p-4">
            <p className="flex items-center gap-2 font-semibold">
              <LayoutTemplate className="h-4 w-4 text-primary" aria-hidden />
              {t('onboarding.templateTitle')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.templateBody')}</p>
            {templates.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">{t('onboarding.templateEmpty')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {templates.slice(0, 6).map((template) => (
                  <li key={template.id}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void finishWithTemplate(template.id)}
                    >
                      {template.name}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form
            className="rounded-xl border border-border/70 bg-card/40 p-4"
            onSubmit={(event) => generateAi(event)}
          >
            <p className="flex items-center gap-2 font-semibold">
              <Bot className="h-4 w-4 text-primary" aria-hidden />
              {t('onboarding.aiTitle')}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t('onboarding.aiBody')}</p>
            <label className="mt-3 flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('onboarding.aiPrompt')}</span>
              <Input
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                placeholder={t('onboarding.aiPromptPlaceholder')}
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" variant="outline" disabled={aiGenerating || !aiPrompt.trim()}>
                {aiGenerating ? t('ai.generating') : t('onboarding.aiGenerate')}
              </Button>
              {aiPreview ? (
                <Button type="button" variant="primary" disabled={busy} onClick={() => void confirmAiBoard()}>
                  {t('onboarding.aiUseBoard')}
                </Button>
              ) : null}
            </div>
            {aiPreview?.board?.name ? (
              <p className="mt-2 text-sm text-muted-foreground">{aiPreview.board.name}</p>
            ) : null}
          </form>

          {busy ? <p className="text-sm text-muted-foreground">{t('onboarding.creatingSample')}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
