import { Badge, Button, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { AppUser } from '@/types/users'

type ViewUserModalProps = {
  isOpen: boolean
  onClose: () => void
  user: AppUser | null
}

export function ViewUserModal({ isOpen, onClose, user }: ViewUserModalProps) {
  const { t } = useI18n()
  if (!user) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('users.viewUser')}>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('users.username')}</dt>
          <dd>{user.username}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('common.email')}</dt>
          <dd className="break-all">{user.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('common.role')}</dt>
          <dd>
            <Badge variant="secondary">{user.role}</Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('common.status')}</dt>
          <dd>
            <Badge variant={user.status === 'Active' ? 'success' : 'secondary'}>{user.status}</Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t('common.lastLogin')}</dt>
          <dd>{user.lastLoginAt || t('users.never')}</dd>
        </div>
      </dl>
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </Modal>
  )
}
