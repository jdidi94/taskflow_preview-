import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { AppUser, EditUserFormData } from '@/types/users'

const ROLE_OPTIONS = ['user', 'admin', 'moderator', 'viewer', 'super_admin'] as const

type EditUserModalProps = {
  isOpen: boolean
  onClose: () => void
  user: AppUser | null
  onSubmit: (userId: string, data: EditUserFormData) => Promise<void>
}

export function EditUserModal({ isOpen, onClose, user, onSubmit }: EditUserModalProps) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [isActive, setIsActive] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setUsername(user.username)
    setEmail(user.email)
    setRole(user.role)
    setIsActive(user.status === 'Active')
    setError(null)
  }, [user])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await onSubmit(String(user.id), { username: username.trim(), email: email.trim(), role, isActive })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('users.updateError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('users.editUser')}>
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          {t('common.active')}
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
