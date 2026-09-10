import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { Button, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success'

type ConfirmationDialogProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmationType
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  type = 'info',
  isLoading = false,
}: ConfirmationDialogProps) {
  const { t } = useI18n()

  const icon =
    type === 'danger' ? (
      <XCircle className="h-5 w-5 text-destructive" />
    ) : type === 'warning' ? (
      <AlertTriangle className="h-5 w-5 text-warning" />
    ) : type === 'success' ? (
      <CheckCircle2 className="h-5 w-5 text-success" />
    ) : (
      <Info className="h-5 w-5 text-info" />
    )

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => undefined : onClose} title={title} description={description}>
      <div className="mb-4 flex items-start gap-3">{icon}</div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          {cancelText ?? t('common.cancel')}
        </Button>
        <Button variant={type === 'danger' ? 'destructive' : 'primary'} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? t('common.loading') : (confirmText ?? t('common.confirm'))}
        </Button>
      </div>
    </Modal>
  )
}
