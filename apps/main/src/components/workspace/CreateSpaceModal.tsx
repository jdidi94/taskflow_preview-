import { useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateSpaceMutation } from '@/services/spacesApi'

type CreateSpaceModalProps = {
  open: boolean
  workspaceId: string
  onClose: () => void
  onCreated?: () => void
}

export function CreateSpaceModal({ open, workspaceId, onClose, onCreated }: CreateSpaceModalProps) {
  const { t } = useI18n()
  const [createSpace, { isLoading }] = useCreateSpaceMutation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function reset() {
    setName('')
    setDescription('')
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
    try {
      await createSpace({
        workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap()
      reset()
      onClose()
      onCreated?.()
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('workspace.createError')))
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={t('workspace.createTitle')}
      description={t('workspace.createDescription')}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
        {formError ? (
          <Alert variant="error" title={t('workspace.createError')} description={formError} />
        ) : null}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('common.name')}</span>
          <Input
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('workspace.description')}</span>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading || !name.trim()}>
            {isLoading ? t('workspace.creating') : t('workspace.create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
