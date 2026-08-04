import { useEffect, useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import type { Task, TaskPriority } from '@/types/domain'

type TaskDetailModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  task?: Task | null
  saving?: boolean
  onClose: () => void
  onSubmit: (values: {
    title: string
    description?: string
    priority: TaskPriority
  }) => Promise<void>
  onDelete?: () => Promise<void>
}

export function TaskDetailModal({
  open,
  mode,
  task,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: TaskDetailModalProps) {
  const { t } = useI18n()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [formError, setFormError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setPriority(task?.priority ?? 'medium')
    setFormError(null)
    setDeleting(false)
  }, [open, task])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
      })
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('board.saveError')))
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    setFormError(null)
    try {
      await onDelete()
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('board.deleteTaskError')))
      setDeleting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={mode === 'edit' ? t('board.editTask') : t('board.createTask')}
      description={mode === 'edit' ? t('board.editTaskHint') : t('board.createTaskHint')}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
        {formError ? (
          <Alert variant="error" title={t('board.saveError')} description={formError} />
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('board.taskTitle')}</span>
          <Input
            required
            minLength={1}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving || deleting}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('board.taskDescription')}</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving || deleting}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('board.priorityLabel')}</span>
          <select
            className="tf-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            disabled={saving || deleting}
          >
            <option value="low">{t('board.priorityLow')}</option>
            <option value="medium">{t('board.priorityMedium')}</option>
            <option value="high">{t('board.priorityHigh')}</option>
            <option value="critical">{t('board.priorityCritical')}</option>
          </select>
        </label>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {mode === 'edit' && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              disabled={saving || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? t('board.deleting') : t('common.delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving || deleting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={saving || deleting || !title.trim()}>
              {saving ? t('board.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
