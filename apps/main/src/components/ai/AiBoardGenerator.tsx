import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Loading } from '@taskflow/ui'

import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { getAiSocket } from '@/lib/socket'
import { useCreateBoardMutation } from '@/services/boardsApi'
import { useCreateTaskMutation } from '@/services/tasksApi'
import { useListWorkspacesQuery } from '@/services/workspacesApi'
import { useListByWorkspaceQuery } from '@/services/spacesApi'
import { useGetBoardQuery } from '@/services/boardsApi'

type GeneratedBoard = {
  board?: { name?: string; description?: string }
  columns?: Array<{ name?: string }>
  tasks?: Array<{ title?: string; description?: string; priority?: string; column?: string }>
}

type Props = {
  embedded?: boolean
}

export function AiBoardGenerator({ embedded = false }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: workspacesData, isLoading: loadingWorkspaces } = useListWorkspacesQuery()
  const workspaces = workspacesData?.data ?? []
  const firstWorkspaceId = workspaces[0]?.id ?? ''

  const { data: spacesData } = useListByWorkspaceQuery(firstWorkspaceId, { skip: !firstWorkspaceId })
  const spaces = spacesData?.data ?? []

  const [prompt, setPrompt] = useState('')
  const [spaceId, setSpaceId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState<GeneratedBoard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createBoard, { isLoading: creatingBoard }] = useCreateBoardMutation()
  const [createTask] = useCreateTaskMutation()
  const [createdBoardId, setCreatedBoardId] = useState<string | null>(null)
  const { data: createdBoardData } = useGetBoardQuery(createdBoardId ?? '', { skip: !createdBoardId })

  useEffect(() => {
    if (!spaceId && spaces[0]?.id) setSpaceId(spaces[0].id)
  }, [spaceId, spaces])

  const previewTitle = useMemo(
    () => preview?.board?.name || prompt.slice(0, 48) || t('ai.preview'),
    [preview, prompt, t],
  )

  function onGenerate(event: FormEvent) {
    event.preventDefault()
    if (!prompt.trim()) return
    setError(null)
    setPreview(null)
    setGenerating(true)

    try {
      const socket = getAiSocket()
      const onDone = (payload: { success?: boolean; data?: GeneratedBoard; error?: string }) => {
        setGenerating(false)
        socket.off('board_generated', onDone)
        socket.off('board_generation_error', onFail)
        if (payload?.data) setPreview(payload.data)
        else setError(t('ai.error'))
      }
      const onFail = (payload: { error?: string; details?: string }) => {
        setGenerating(false)
        socket.off('board_generated', onDone)
        socket.off('board_generation_error', onFail)
        setError(payload?.error || payload?.details || t('ai.error'))
      }
      socket.on('board_generated', onDone)
      socket.on('board_generation_error', onFail)
      socket.emit('generate_board', { prompt: prompt.trim() })
    } catch (err) {
      setGenerating(false)
      setError(getApiErrorMessage(err, t('ai.error')))
    }
  }

  async function onConfirm() {
    if (!preview || !spaceId) return
    setError(null)
    try {
      const board = await createBoard({
        spaceId,
        name: String(preview.board?.name || prompt.slice(0, 40) || 'AI Board'),
        description: preview.board?.description,
      }).unwrap()
      setCreatedBoardId(board.data.id)
    } catch (err) {
      setError(getApiErrorMessage(err, t('ai.error')))
    }
  }

  useEffect(() => {
    async function seedTasks() {
      if (!createdBoardId || !createdBoardData?.data || !preview?.tasks?.length) {
        if (createdBoardId && createdBoardData?.data && !preview?.tasks?.length) {
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

      for (const task of preview.tasks.slice(0, 20)) {
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
          // continue seeding remaining tasks
        }
      }
      navigate(`/boards/${createdBoardId}`, { replace: true })
    }

    void seedTasks()
  }, [createdBoardId, createdBoardData, preview, createTask, navigate])

  if (loadingWorkspaces) return <Loading label={t('common.loading')} />

  return (
    <div className="flex flex-col gap-8">
      {!embedded ? (
        <section>
          <PageBreadcrumbs
            items={[
              { label: t('common.dashboard'), to: '/dashboard' },
              { label: t('ai.generatorTitle') },
            ]}
          />
          <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('ai.generatorTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">{t('ai.generatorSubtitle')}</p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{t('ai.generatorSubtitle')}</p>
      )}

      {spaces.length === 0 ? <Alert variant="info" title={t('ai.noSpaces')} /> : null}
      {error ? <Alert variant="error" title={t('ai.error')} description={error} /> : null}

      <Card>
        <CardContent className="py-4">
          <form className="flex flex-col gap-3" onSubmit={onGenerate}>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('ai.promptLabel')}</span>
              <Input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={t('ai.promptPlaceholder')}
                required
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('ai.spaceLabel')}</span>
              <select
                className="h-10 rounded-md border border-border bg-background px-3"
                value={spaceId}
                onChange={(event) => setSpaceId(event.target.value)}
                disabled={!spaces.length}
              >
                {spaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" variant="primary" disabled={generating || !spaces.length}>
              {generating ? t('ai.generating') : t('ai.generate')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('ai.preview')}: {previewTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{preview.board?.description}</p>
            <p className="text-sm">
              {(preview.columns ?? []).map((column) => column.name).filter(Boolean).join(' · ')}
            </p>
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {(preview.tasks ?? []).slice(0, 8).map((task, index) => (
                <li key={`${task.title}-${index}`}>{task.title}</li>
              ))}
            </ul>
            <Button variant="primary" disabled={creatingBoard || !spaceId} onClick={() => void onConfirm()}>
              {creatingBoard ? t('ai.creating') : t('ai.confirm')}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
