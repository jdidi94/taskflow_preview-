import { useI18n } from '@/i18n'

type CompletionRateChartProps = {
  /** 0–100 */
  rate: number
  completed?: number
  total?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** Show horizontal bar under the ring as a second read. */
  showBar?: boolean
}

const SIZE = {
  sm: { box: 88, radius: 34, stroke: 7, text: 'text-lg' },
  md: { box: 128, radius: 50, stroke: 9, text: 'text-2xl' },
  lg: { box: 160, radius: 64, stroke: 11, text: 'text-3xl' },
} as const

export function CompletionRateChart({
  rate,
  completed,
  total,
  size = 'md',
  className = '',
  showBar = true,
}: CompletionRateChartProps) {
  const { t } = useI18n()
  const clamped = Math.min(100, Math.max(0, Number.isFinite(rate) ? rate : 0))
  const { box, radius, stroke, text } = SIZE[size]
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const center = box / 2
  const label = `${clamped.toFixed(0)}%`

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div
        className="relative"
        style={{ width: box, height: box }}
        role="img"
        aria-label={t('analytics.rateChartLabel', { rate: clamped.toFixed(0) })}
      >
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="-rotate-90" aria-hidden>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-muted"
            strokeWidth={stroke}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-semibold tabular-nums tracking-tight text-foreground ${text}`}>
            {label}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('analytics.rate')}
          </span>
        </div>
      </div>

      {showBar ? (
        <div className="w-full max-w-[12rem]">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(clamped)}
            aria-label={t('analytics.rate')}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${clamped}%` }}
            />
          </div>
          {completed != null && total != null ? (
            <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
              {t('analytics.rateCompletedOf', { completed, total })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
