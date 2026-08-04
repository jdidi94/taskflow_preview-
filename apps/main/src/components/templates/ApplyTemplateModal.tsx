import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useCreateBoardMutation,
  useCreateColumnMutation,
  useDeleteColumnMutation,
} from '@/services/boardsApi'
import { useCreateSpaceMutation, useListByWorkspaceQuery } from '@/services/spacesApi'
import {
  extractTemplateLists,
  type TemplateItem,
} from '@/services/templatesApi'
import { useListWorkspacesQuery } from '@/services/workspacesApi'

type Props = {
  open: boolean
  template: TemplateItem | null
  onClose: () => void
}

export function ApplyTemplateModal({ open, template, onClose }: Props) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: workspacesData, isLoading: workspacesLoading } = useListWorkspacesQuery(undefined, {
    skip: !open,
  })
  const [createBoard] = useCreateBoardMutation()
  const [createColumn] = useCreateColumnMutation()
  const [deleteColumn] = useDeleteColumnMutation()
  const [createSpace] = useCreateSpaceMutation()

  const [workspaceId, setWorkspaceId] = useState('')
  const [spaceId, setSpaceId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const workspaces = workspacesData?.data ?? []
  const isSpaceTemplate = template?.type === 'space'
  const isBoardTemplate = !template || template.type === 'board' || template.type === 'workflow'

  const { data: spacesData, isLoading: spacesLoading } = useListByWorkspaceQuery(workspaceId, {
    skip: !open || !workspaceId || isSpaceTemplate,
  })
  const spaces = useMemo(
    () => (spacesData?.data ?? []).filter((space) => !space.archived && space.isActive !== false),
    [spacesData?.data],
  )

  useEffect(() => {
    if (!open || !template) return
    setName(template.name)
    setDescription(template.description ?? '')
    setError(null)
    setBusy(false)
  }, [open, template])

  useEffect(() => {
    if (!open) return
    if (!workspaceId && workspaces.length === 1) {
      setWorkspaceId(workspaces[0].id)
    }
  }, [open, workspaceId, workspaces])

  useEffect(() => {
    setSpaceId('')
  }, [workspaceId])

  useEffect(() => {
    if (!spaceId && spaces.length === 1) {
      setSpaceId(spaces[0].id)
    }
  }, [spaceId, spaces])

  function handleClose() {
    if (busy) return
    setError(null)
    onClose()
  }

  async function applyBoardColumns(boardId: string, existingColumnIds: string[], lists: Array<{ name: string }>) {
    if (lists.length === 0) return
    for (const columnId of existingColumnIds) {
      await deleteColumn({ boardId, columnId }).unwrap()
    }
    for (const list of lists) {
      await createColumn({ boardId, name: list.name }).unwrap()
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!template) return
    setError(null)
    setBusy(true)

    try {
      if (isSpaceTemplate) {
        if (!workspaceId) {
          setError(t('templates.selectWorkspace'))
          setBusy(false)
          return
        }
        const created = await createSpace({
          workspaceId,
          name: name.trim(),
          description: description.trim() || undefined,
        }).unwrap()

        const boards = Array.isArray((template.content as { boards?: unknown })?.boards)
          ? ((template.content as { boards: unknown[] }).boards ?? [])
          : []

        for (const entry of boards) {
          if (!entry || typeof entry !== 'object') continue
          const boardSeed = entry as Record<string, unknown>
          const boardName = String(boardSeed.name ?? boardSeed.title ?? '').trim()
          if (!boardName) continue
          const board = await createBoard({
            spaceId: created.data.id,
            name: boardName,
            description: boardSeed.description ? String(boardSeed.description) : undefined,
          }).unwrap()
          const lists = extractTemplateLists(boardSeed)
          await applyBoardColumns(
            board.data.id,
            (board.data.columns ?? []).map((column) => column.id),
            lists,
          )
        }

        setBusy(false)
        setError(null)
        onClose()
        navigate(`/spaces/${created.data.id}`)
        return
      }

      if (!isBoardTemplate) {
        setError(t('templates.unsupportedType'))
        setBusy(false)
        return
      }

      if (!spaceId) {
        setError(t('templates.selectSpace'))
        setBusy(false)
        return
      }

      const board = await createBoard({
        spaceId,
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap()

      const lists = extractTemplateLists(template.content)
      await applyBoardColumns(
        board.data.id,
        (board.data.columns ?? []).map((column) => column.id),
        lists,
      )

      setBusy(false)
      setError(null)
      onClose()
      navigate(`/boards/${board.data.id}`)
    } catch (err) {
      setError(getApiErrorMessage(err, t('templates.applyError')))
      setBusy(false)
    }
  }

  if (!template) return null

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={t('templates.applyTitle')}
      description={t('templates.applySubtitle', { name: template.name })}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
        {error ? <Alert variant="error" title={t('templates.applyError')} description={error} /> : null}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('templates.workspace')}</span>
          <select
            className="tf-input"
            required
            value={workspaceId}
            disabled={busy || workspacesLoading}
            onChange={(event) => setWorkspaceId(event.target.value)}
          >
            <option value="">{t('templates.selectWorkspace')}</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>

        {!isSpaceTemplate ? (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('templates.space')}</span>
            <select
              className="tf-input"
              required
              value={spaceId}
              disabled={busy || !workspaceId || spacesLoading}
              onChange={(event) => setSpaceId(event.target.value)}
            >
              <option value="">{t('templates.selectSpace')}</option>
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  {space.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('common.name')}</span>
          <Input
            required
            minLength={2}
            value={name}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('templates.description')}</span>
          <Input
            value={description}
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <p className="text-xs text-muted-foreground">
          {isSpaceTemplate
            ? t('templates.applySpaceHint')
            : t('templates.applyBoardHint', {
                count: extractTemplateLists(template.content).length,
              })}
        </p>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('templates.applying') : t('templates.apply')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
