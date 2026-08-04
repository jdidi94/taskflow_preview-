import { useI18n } from '@/i18n'

type ColumnWipMeterProps = {
  count: number
  limit?: number | null
  className?: string
}

export function ColumnWipMeter({ count, limit, className = '' }: ColumnWipMeterProps) {
  const { t } = useI18n()
  if (limit == null || limit <= 0) return null

  const ratio = count / limit
  const over = count > limit
  const near = !over && ratio >= 0.8
  const widthPct = Math.min(100, Math.max(0, ratio * 100))

  const fillClass = over ? 'bg-destructive' : near ? 'bg-warning' : 'bg-primary'
  const label = over
    ? t('board.wipOverLimit', { count, limit })
    : t('board.wipMeter', { count, limit })

  return (
    <div className={`mb-2 ${className}`}>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={count}
        aria-label={label}
        title={label}
      >
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-200 ease-out ${fillClass}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  )
}
