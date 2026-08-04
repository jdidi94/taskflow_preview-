import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useUpdateBoardMutation } from '@/services/boardsApi'
import type { Board } from '@/types/domain'

type BoardSettingsPanelProps = {
  board: Board
  spaceId: string
  disabled?: boolean
}

export function BoardSettingsPanel({ board, spaceId, disabled }: BoardSettingsPanelProps) {
  const { t } = useI18n()
  const [name, setName] = useState(board.name)
  const [description, setDescription] = useState(board.description ?? '')
  const [visibility, setVisibility] = useState<Board['visibility']>(board.visibility ?? 'private')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [updateBoard, { isLoading: saving }] = useUpdateBoardMutation()

  const archived = Boolean(board.archived) || board.isActive === false
  const readOnly = Boolean(disabled || archived)

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

  return (
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
  )
}
