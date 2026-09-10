import { useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { AddUserFormData } from '@/types/users'

const ROLE_OPTIONS = ['user', 'admin', 'moderator', 'viewer', 'super_admin'] as const

type AddUserModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AddUserFormData) => Promise<void>
}

export function AddUserModal({ isOpen, onClose, onSubmit }: AddUserModalProps) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSubmit({ username: username.trim(), email: email.trim(), role })
      setUsername('')
      setEmail('')
      setRole('user')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.createError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('users.addUser')}>
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('users.username')}</span>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('common.email')}</span>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('common.role')}</span>
          <select
            className="tf-input h-10 rounded-md border border-border bg-background px-3"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('common.loading') : t('users.addUser')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
