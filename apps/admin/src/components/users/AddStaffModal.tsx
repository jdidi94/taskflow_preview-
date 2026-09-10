import { useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { STAFF_PASSWORD_RE, STAFF_ROLES, STAFF_USERNAME_RE, staffRoleMessageKey } from '@/lib/staff'
import type { CreateStaffInput, StaffRole } from '@/types/staff'

type AddStaffModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateStaffInput) => Promise<void>
}

export function AddStaffModal({ isOpen, onClose, onSubmit }: AddStaffModalProps) {
  const { t } = useI18n()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<StaffRole>('admin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setUserName('')
    setUserEmail('')
    setPassword('')
    setConfirmPassword('')
    setRole('admin')
    setFirstName('')
    setLastName('')
    setNotes('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!STAFF_USERNAME_RE.test(userName.trim())) {
      setError(t('staff.usernameHint'))
      return
    }
    if (!STAFF_PASSWORD_RE.test(password)) {
      setError(t('staff.passwordHint'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('settings.passwordMismatch'))
      return
    }

    setBusy(true)
    try {
      await onSubmit({
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        password,
        role,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.createError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('staff.add')}>
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('users.username')}</span>
          <Input value={userName} onChange={(event) => setUserName(event.target.value)} required />
          <span className="text-xs text-muted-foreground">{t('staff.usernameHint')}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('common.email')}</span>
          <Input type="email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} required />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('settings.firstName')}</span>
            <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('settings.lastName')}</span>
            <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('common.role')}</span>
          <select
            className="h-10 rounded-md border border-border bg-background px-3"
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole)}
          >
            {STAFF_ROLES.map((option) => (
              <option key={option} value={option}>
                {t(staffRoleMessageKey(option))}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('common.password')}</span>
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          <span className="text-xs text-muted-foreground">{t('staff.passwordHint')}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('settings.confirmPassword')}</span>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('settings.notes')}</span>
          <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? t('common.loading') : t('staff.add')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
