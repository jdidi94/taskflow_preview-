import { useEffect, useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@taskflow/ui'

import { useI18n } from '@/i18n'
import type { Quota, QuotaPeriod, QuotaType } from '@/types/quotas'

const QUOTA_TYPES: QuotaType[] = ['api_requests', 'file_uploads', 'ai_jobs', 'storage', 'users', 'spaces']
const QUOTA_PERIODS: QuotaPeriod[] = ['hourly', 'daily', 'weekly', 'monthly', 'yearly']

type QuotaFormModalProps = {
  isOpen: boolean
  quota: Quota | null
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (input: {
    userId?: string
    workspaceId?: string | null
    type?: QuotaType
    period?: QuotaPeriod
    limit: number
    isActive?: boolean
  }) => Promise<void>
}

export function QuotaFormModal({ isOpen, quota, busy, error, onClose, onSubmit }: QuotaFormModalProps) {
  const { t } = useI18n()
  const editing = Boolean(quota)
  const [userId, setUserId] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [type, setType] = useState<QuotaType>('ai_jobs')
  const [period, setPeriod] = useState<QuotaPeriod>('monthly')
  const [limit, setLimit] = useState('100')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    if (quota) {
      setUserId(String(quota.userId))
      setWorkspaceId(quota.workspaceId ? String(quota.workspaceId) : '')
      setType((quota.type as QuotaType) || 'ai_jobs')
      setPeriod((quota.period as QuotaPeriod) || 'monthly')
      setLimit(String(quota.limit ?? 0))
      setIsActive(quota.isActive !== false)
      return
    }
    setUserId('')
    setWorkspaceId('')
    setType('ai_jobs')
    setPeriod('monthly')
    setLimit('100')
    setIsActive(true)
  }, [isOpen, quota])

  function typeLabel(value: QuotaType) {
    if (value === 'api_requests') return t('ai.typeApi')
    if (value === 'file_uploads') return t('ai.typeUploads')
    if (value === 'ai_jobs') return t('ai.typeAiJobs')
    if (value === 'storage') return t('ai.typeStorage')
    if (value === 'users') return t('ai.typeUsers')
    return t('ai.typeSpaces')
  }

  function periodLabel(value: QuotaPeriod) {
    if (value === 'hourly') return t('ai.periodHourly')
    if (value === 'daily') return t('ai.periodDaily')
    if (value === 'weekly') return t('ai.periodWeekly')
    if (value === 'yearly') return t('ai.periodYearly')
    return t('ai.periodMonthly')
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const parsedLimit = Number(limit)
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) return
    if (editing) {
      await onSubmit({ limit: Math.floor(parsedLimit), isActive })
      return
    }
    await onSubmit({
      userId: userId.trim(),
      workspaceId: workspaceId.trim() || null,
      type,
      period,
      limit: Math.floor(parsedLimit),
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={editing ? t('ai.editQuota') : t('ai.addQuota')}>
      <form className="space-y-3" onSubmit={(event) => void handleSubmit(event)}>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('ai.userId')}</span>
          <Input value={userId} onChange={(event) => setUserId(event.target.value)} required={!editing} disabled={editing} />
          {!editing ? <span className="text-xs text-muted-foreground">{t('ai.userIdHint')}</span> : null}
        </label>
        {!editing ? (
          <label className="flex flex-col gap-1 text-sm">
            <span>{t('ai.workspaceId')}</span>
            <Input value={workspaceId} onChange={(event) => setWorkspaceId(event.target.value)} />
          </label>
        ) : null}
        {!editing ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('ai.type')}</span>
              <select
                className="h-10 rounded-md border border-border bg-background px-3"
                value={type}
                onChange={(event) => setType(event.target.value as QuotaType)}
              >
                {QUOTA_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {typeLabel(item)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span>{t('ai.period')}</span>
              <select
                className="h-10 rounded-md border border-border bg-background px-3"
                value={period}
                onChange={(event) => setPeriod(event.target.value as QuotaPeriod)}
              >
                {QUOTA_PERIODS.map((item) => (
                  <option key={item} value={item}>
                    {periodLabel(item)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('ai.limit')}</span>
          <Input type="number" min={0} value={limit} onChange={(event) => setLimit(event.target.value)} required />
          <span className="text-xs text-muted-foreground">{t('ai.limitHint')}</span>
        </label>
        {editing ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            {t('ai.quotaActive')}
          </label>
        ) : null}
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
