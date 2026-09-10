import { useState, type FormEvent } from 'react'
import { Alert, Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useCreateWorkspaceMutation } from '@/services/workspacesApi'

type CreateWorkspaceModalProps = {
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function CreateWorkspaceModal({ open, onClose, onCreated }: CreateWorkspaceModalProps) {
  const { t } = useI18n()
  const [createWorkspace, { isLoading }] = useCreateWorkspaceMutation()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  function reset() {
    setName('')
    setDescription('')
    setFormError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)
    try {
      await createWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      }).unwrap()
      reset()
      onClose()
      onCreated?.()
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('dashboard.createError')))
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={t('dashboard.createTitle')}
      description={t('dashboard.createDescription')}
    >
      <form className="mt-4 flex flex-col gap-3" onSubmit={(event) => void onSubmit(event)}>
        {formError ? <Alert variant="error" title={t('dashboard.createError')} description={formError} /> : null}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('common.name')}</span>
          <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t('dashboard.description')}</span>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? t('dashboard.creating') : t('dashboard.create')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
