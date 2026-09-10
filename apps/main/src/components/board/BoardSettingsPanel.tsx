import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input, Modal } from '@taskflow/ui'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'

import { ArchiveConfirmModal } from '@/components/common/ArchiveConfirmModal'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useArchiveBoardMutation,
  usePermanentDeleteBoardMutation,
  useRestoreBoardMutation,
  useUpdateBoardMutation,
} from '@/services/boardsApi'
import type { Board } from '@/types/domain'

type BoardSettingsPanelProps = {
  board: Board
  spaceId: string
  disabled?: boolean
}

export function BoardSettingsPanel({ board, spaceId, disabled }: BoardSettingsPanelProps) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [name, setName] = useState(board.name)
  const [description, setDescription] = useState(board.description ?? '')
  const [visibility, setVisibility] = useState<Board['visibility']>(board.visibility ?? 'private')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [updateBoard, { isLoading: saving }] = useUpdateBoardMutation()

  const archived = Boolean(board.archived) || board.isActive === false
  const readOnly = Boolean(disabled || archived)

  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [archiveBoard, { isLoading: archiving }] = useArchiveBoardMutation()
  const [restoreBoard, { isLoading: restoring }] = useRestoreBoardMutation()
  const [permanentDelete, { isLoading: deleting }] = usePermanentDeleteBoardMutation()

  useEffect(() => {
    setName(board.name)
    setDescription(board.description ?? '')
    setVisibility(board.visibility ?? 'private')
  }, [board.id, board.name, board.description, board.visibility])

  const dirty = useMemo(() => {
    return (
      name.trim() !== board.name.trim() ||
      description.trim() !== (board.description ?? '').trim() ||
      (visibility ?? 'private') !== (board.visibility ?? 'private')
    )
  }, [name, description, visibility, board.name, board.description, board.visibility])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (readOnly) return
    setError(null)
    setSaved(false)
    try {
      await updateBoard({
        id: board.id,
        spaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        visibility: visibility ?? 'private',
      }).unwrap()
      setSaved(true)
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.settingsSaveError')))
    }
  }

  async function confirmArchiveOrRestore() {
    setArchiveError(null)
    try {
      if (archived) {
        await restoreBoard({ id: board.id, spaceId }).unwrap()
      } else {
        await archiveBoard({ id: board.id, spaceId }).unwrap()
        navigate(`/spaces/${spaceId}`)
      }
      setArchiveOpen(false)
    } catch (err) {
      setArchiveError(getApiErrorMessage(err, t('archive.errorTitle')))
    }
  }

  async function confirmPermanentDelete() {
    if (deleteConfirm.trim() !== board.name) return
    setDeleteError(null)
    try {
      await permanentDelete({ id: board.id, spaceId }).unwrap()
      setDeleteOpen(false)
      navigate(`/spaces/${spaceId}`, { replace: true })
    } catch (err) {
      setDeleteError(getApiErrorMessage(err, t('board.deleteError')))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card id="board-settings" className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{t('board.settingsTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('board.settingsSubtitle')}</p>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmit(e)}>
            {error ? (
              <Alert variant="error" title={t('board.settingsSaveError')} description={error} />
            ) : null}
            {saved ? <Alert variant="success" title={t('board.settingsSaved')} /> : null}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('common.name')}</span>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setSaved(false)
                }}
                disabled={readOnly || saving}
                required
                minLength={2}
                maxLength={200}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('board.taskDescription')}</span>
              <textarea
                className="tf-input min-h-20 resize-y"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setSaved(false)
                }}
                disabled={readOnly || saving}
                maxLength={500}
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium">{t('board.visibility')}</span>
              <select
                className="tf-input"
                value={visibility ?? 'private'}
                onChange={(e) => {
                  setVisibility(e.target.value as Board['visibility'])
                  setSaved(false)
                }}
                disabled={readOnly || saving}
              >
                <option value="private">{t('board.visibilityPrivate')}</option>
                <option value="workspace">{t('board.visibilityWorkspace')}</option>
                <option value="public">{t('board.visibilityPublic')}</option>
              </select>
            </label>

            {!readOnly ? (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || !dirty || name.trim().length < 2}
                >
                  {saving ? t('board.saving') : t('common.save')}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t('board.settingsReadOnly')}</p>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">{t('board.dangerTitle')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('board.dangerSubtitle')}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3">
            <div>
              <p className="text-sm font-medium">
                {archived ? t('board.restoreLabel') : t('board.archiveLabel')}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {archived ? t('board.restoreHint') : t('board.archiveHint')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setArchiveError(null)
                setArchiveOpen(true)
              }}
            >
              {archived ? (
                <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <Archive className="h-3.5 w-3.5" aria-hidden />
              )}
              {archived ? t('archive.restore') : t('archive.archive')}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <div>
              <p className="text-sm font-medium text-destructive">{t('board.deleteLabel')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {archived ? t('board.deleteHint') : t('board.deleteNeedArchive')}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 text-destructive"
              disabled={!archived}
              onClick={() => {
                setDeleteError(null)
                setDeleteConfirm('')
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t('board.deletePermanent')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ArchiveConfirmModal
        open={archiveOpen}
        mode={archived ? 'restore' : 'archive'}
        entityLabel={t('archive.entityBoard')}
        name={board.name}
        busy={archiving || restoring}
        error={archiveError}
        onClose={() => {
          if (archiving || restoring) return
          setArchiveOpen(false)
          setArchiveError(null)
        }}
        onConfirm={() => void confirmArchiveOrRestore()}
      />

      <Modal
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteError(null)
          setDeleteConfirm('')
        }}
        title={t('board.deleteTitle')}
        description={t('board.deleteDescription', { name: board.name })}
      >
        <div className="mt-4 flex flex-col gap-3">
          {deleteError ? (
            <Alert variant="error" title={t('board.deleteError')} description={deleteError} />
          ) : null}
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t('board.deleteConfirmLabel')}</span>
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              disabled={deleting}
              autoComplete="off"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={deleting}
              onClick={() => {
                setDeleteOpen(false)
                setDeleteConfirm('')
                setDeleteError(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting || deleteConfirm.trim() !== board.name}
              onClick={() => void confirmPermanentDelete()}
            >
              {deleting ? t('common.loading') : t('board.deletePermanent')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
