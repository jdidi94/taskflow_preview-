import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { STAFF_ROLES, STAFF_USERNAME_RE, staffRoleMessageKey } from '@/lib/staff'
import type { StaffAdmin, StaffRole, UpdateStaffInput } from '@/types/staff'

type EditStaffModalProps = {
  isOpen: boolean
  onClose: () => void
  staff: StaffAdmin | null
  isSelf: boolean
  onSubmit: (id: string, data: UpdateStaffInput) => Promise<void>
}

export function EditStaffModal({ isOpen, onClose, staff, isSelf, onSubmit }: EditStaffModalProps) {
  const { t } = useI18n()
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('admin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!staff) return
    setUserName(staff.userName)
    setUserEmail(staff.userEmail)
    setRole(staff.role)
    setFirstName(staff.firstName ?? '')
    setLastName(staff.lastName ?? '')
    setPhoneNumber(staff.phoneNumber ?? '')
    setNotes(staff.notes ?? '')
    setError(null)
  }, [staff, isOpen])

  if (!staff) return null

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!staff) return
    setError(null)
    if (!STAFF_USERNAME_RE.test(userName.trim())) {
      setError(t('staff.usernameHint'))
      return
    }

    setBusy(true)
    try {
      await onSubmit(staff.id, {
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        role: isSelf ? undefined : role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staff.updateError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('staff.edit')}>
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('users.username')}</span>
          <Input value={userName} onChange={(event) => setUserName(event.target.value)} required />
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
          <span>{t('settings.phone')}</span>
          <Input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('common.role')}</span>
          <select
            className="h-10 rounded-md border border-border bg-background px-3 disabled:opacity-60"
            value={role}
            disabled={isSelf}
            onChange={(event) => setRole(event.target.value as StaffRole)}
          >
            {STAFF_ROLES.map((option) => (
              <option key={option} value={option}>
                {t(staffRoleMessageKey(option))}
              </option>
            ))}
          </select>
          {isSelf ? <span className="text-xs text-muted-foreground">{t('staff.cannotChangeOwnRole')}</span> : null}
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
            {busy ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
