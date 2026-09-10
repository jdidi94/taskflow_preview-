type ChartRow = {
  id: string
  label: string
  value: number
}

type AnalyticsSeriesChartProps = {
  rows: ChartRow[]
  emptyLabel: string
  barClassName?: string
  chartLabel: string
}

export function AnalyticsSeriesChart({
  rows,
  emptyLabel,
  barClassName = 'bg-primary',
  chartLabel,
}: AnalyticsSeriesChartProps) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyLabel}</p>
  }

  const max = Math.max(1, ...rows.map((row) => row.value))

  return (
    <div className="overflow-x-auto" dir="ltr">
      <div className="flex h-52 min-w-full items-stretch gap-1 sm:gap-1.5" role="img" aria-label={chartLabel}>
        {rows.map((row) => {
          const height = Math.max(row.value > 0 ? 6 : 2, Math.round((row.value / max) * 100))
          return (
            <div key={row.id} className="flex min-w-6 flex-1 flex-col items-center">
              <div className="flex w-full flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[10px] tabular-nums text-muted-foreground">{row.value}</span>
                <div
                  className={`w-full max-w-8 rounded-t motion-safe:transition-[height] ${barClassName}`}
                  style={{ height: `${height}%` }}
                  title={`${row.label}: ${row.value}`}
                />
              </div>
              <span className="mt-1 max-w-full truncate text-[10px] text-muted-foreground" title={row.label}>
                {row.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
