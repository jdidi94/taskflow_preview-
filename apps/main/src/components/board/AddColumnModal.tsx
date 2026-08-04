import { useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateColumnMutation } from '@/services/boardsApi'

type AddColumnModalProps = {
  open: boolean
  boardId: string
  onClose: () => void
  onCreated?: () => void
}

export function AddColumnModal({ open, boardId, onClose, onCreated }: AddColumnModalProps) {
  const { t } = useI18n()
  const [createColumn, { isLoading }] = useCreateColumnMutation()
  const [name, setName] = useState('')
  const [limit, setLimit] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function reset() {
    setName('')
    setLimit('')
    setFormError(null)
  }

  function handleClose() {
    if (isLoading) return
    reset()
    onClose()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    const parsedLimit = limit.trim() === '' ? null : Number(limit)
    if (parsedLimit !== null && (Number.isNaN(parsedLimit) || parsedLimit < 0)) {
      setFormError(t('board.limitInvalid'))
      return
    }
    try {
      await createColumn({
        boardId,
        name: name.trim(),
        limit: parsedLimit,
      }).unwrap()
      reset()
      onClose()
      onCreated?.()
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('board.createColumnError')))
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={t('board.createColumnTitle')}
      description={t('board.createColumnDescription')}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
        {formError ? (
          <Alert variant="error" title={t('board.createColumnError')} description={formError} />
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('common.name')}</span>
          <Input
            required
            minLength={1}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            placeholder={t('board.columnNamePlaceholder')}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('board.wipLimit')}</span>
          <Input
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            disabled={isLoading}
            placeholder={t('board.wipLimitPlaceholder')}
          />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !name.trim()}>
            {isLoading ? t('board.creatingColumn') : t('board.createColumn')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
