import { useState } from 'react'
import { Alert, Button, Modal } from '@taskflow/ui'
import { AlertTriangle, Trash2 } from 'lucide-react'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useDeleteColumnMutation } from '@/services/boardsApi'
import type { BoardColumn } from '@/types/domain'

type DeleteColumnModalProps = {
  open: boolean
  boardId: string
  column: BoardColumn | null
  taskCount: number
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteColumnModal({
  open,
  boardId,
  column,
  taskCount,
  onClose,
  onDeleted,
}: DeleteColumnModalProps) {
  const { t } = useI18n()
  const [deleteColumn, { isLoading }] = useDeleteColumnMutation()
  const [error, setError] = useState<string | null>(null)

  const blocked = taskCount > 0

  function handleClose() {
    if (isLoading) return
    setError(null)
    onClose()
  }

  async function handleConfirm() {
    if (!column || blocked) return
    setError(null)
    try {
      await deleteColumn({ boardId, columnId: column.id }).unwrap()
      onClose()
      onDeleted?.()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.deleteColumnError')))
    }
  }

  return (
    <Modal
      isOpen={open && Boolean(column)}
      onClose={handleClose}
      title={t('board.deleteColumnTitle')}
      description={t('board.deleteColumnDescription')}
    >
      <div className="mt-4 flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('board.deleteColumnConfirm', { name: column?.name ?? '' })}
          </p>
        </div>

        {blocked ? (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <p className="text-sm text-destructive">
              {t('board.deleteColumnBlocked', { count: taskCount })}
            </p>
          </div>
        ) : null}

        {error ? <Alert variant="error" title={t('board.deleteColumnError')} description={error} /> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={isLoading || blocked}
            onClick={() => void handleConfirm()}
          >
            {isLoading ? t('board.deleting') : t('board.deleteColumn')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
