type AnalyticsTaskMixProps = {
  pending: number
  inProgress: number
  completed: number
  pendingLabel: string
  progressLabel: string
  doneLabel: string
  chartLabel: string
}

export function AnalyticsTaskMix({
  pending,
  inProgress,
  completed,
  pendingLabel,
  progressLabel,
  doneLabel,
  chartLabel,
}: AnalyticsTaskMixProps) {
  const total = pending + inProgress + completed
  const parts = [
    { key: 'pending', value: pending, label: pendingLabel, className: 'bg-muted-foreground/40' },
    { key: 'progress', value: inProgress, label: progressLabel, className: 'bg-warning' },
    { key: 'done', value: completed, label: doneLabel, className: 'bg-success' },
  ]

  return (
    <div>
      <div
        className="flex h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={chartLabel}
      >
        {total === 0
          ? null
          : parts.map((part) =>
              part.value > 0 ? (
                <div
                  key={part.key}
                  className={`h-full motion-safe:transition-[width] ${part.className}`}
                  style={{ width: `${(part.value / total) * 100}%` }}
                  title={`${part.label}: ${part.value}`}
                />
              ) : null,
            )}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {parts.map((part) => (
          <li key={part.key} className="rounded-lg border border-border/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">{part.label}</p>
            <p className="text-lg font-semibold tabular-nums">{part.value}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
