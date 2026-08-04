import { Alert, Button, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'

type ArchiveConfirmModalProps = {
  open: boolean
  mode: 'archive' | 'restore'
  entityLabel: string
  name: string
  busy?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: () => void | Promise<void>
}

export function ArchiveConfirmModal({
  open,
  mode,
  entityLabel,
  name,
  busy,
  error,
  onClose,
  onConfirm,
}: ArchiveConfirmModalProps) {
  const { t } = useI18n()
  const isArchive = mode === 'archive'

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isArchive ? t('archive.archiveTitle') : t('archive.restoreTitle')}
      description={
        isArchive
          ? t('archive.archiveDescription', { entity: entityLabel, name })
          : t('archive.restoreDescription', { entity: entityLabel, name })
      }
    >
      <div className="mt-4 flex flex-col gap-3">
        {error ? <Alert variant="error" title={t('archive.errorTitle')} description={error} /> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant={isArchive ? 'outline' : 'primary'}
            className={isArchive ? 'text-destructive' : undefined}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy
              ? isArchive
                ? t('archive.archiving')
                : t('archive.restoring')
              : isArchive
                ? t('archive.confirmArchive')
                : t('archive.confirmRestore')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
