import { Badge, Button, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import { formatStaffName, staffRoleMessageKey } from '@/lib/staff'
import type { StaffAdmin } from '@/types/staff'

type ViewStaffModalProps = {
  isOpen: boolean
  onClose: () => void
  staff: StaffAdmin | null
}

export function ViewStaffModal({ isOpen, onClose, staff }: ViewStaffModalProps) {
  const { t } = useI18n()
  if (!staff) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('staff.view')}>
      <dl className="space-y-2 text-sm">
        <Row label={t('common.name')} value={formatStaffName(staff)} />
        <Row label={t('users.username')} value={staff.userName} />
        <Row label={t('common.email')} value={staff.userEmail} />
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('common.role')}</dt>
          <dd>
            <Badge variant="secondary">{t(staffRoleMessageKey(staff.role))}</Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('common.status')}</dt>
          <dd>
            <Badge variant={staff.isActive ? 'success' : 'secondary'}>
              {staff.isActive ? t('common.active') : t('common.inactive')}
            </Badge>
          </dd>
        </div>
        <Row label={t('settings.twoFactor')} value={staff.hasTwoFactorAuth ? t('common.yes') : t('common.no')} />
        <Row
          label={t('common.lastLogin')}
          value={staff.lastLoginAt ? new Date(staff.lastLoginAt).toLocaleString() : t('users.never')}
        />
        <Row label={t('common.created')} value={staff.createdAt ? new Date(staff.createdAt).toLocaleString() : '—'} />
        <Row
          label={t('staff.createdBy')}
          value={staff.createdBy ? `${staff.createdBy.userName} · ${staff.createdBy.userEmail}` : '—'}
        />
        {staff.notes ? <Row label={t('settings.notes')} value={staff.notes} /> : null}
      </dl>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[16rem] break-words text-end">{value}</dd>
    </div>
  )
}
