import { useMemo } from 'react'

import { useI18n } from '@/i18n'

export type HeatmapPoint = {
  date: string
  value: number
}

type ActivityHeatmapGridProps = {
  points: HeatmapPoint[]
  /** Number of week columns to show (default 16 ≈ ~4 months). */
  weeks?: number
  className?: string
}

function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date)
  next.setDate(next.getDate() + days)
  return next
}

/** Align to Sunday start (GitHub-style); RTL layouts still use same calendar math. */
function startOfWeekSunday(date: Date): Date {
  const d = startOfLocalDay(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function parsePointDate(raw: string): Date | null {
  const day = raw.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) {
    const fallback = new Date(raw)
    return Number.isNaN(fallback.getTime()) ? null : startOfLocalDay(fallback)
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function intensityClass(value: number, max: number): string {
  if (value <= 0 || max <= 0) return 'bg-muted'
  const ratio = value / max
  if (ratio <= 0.25) return 'bg-primary/25'
  if (ratio <= 0.5) return 'bg-primary/45'
  if (ratio <= 0.75) return 'bg-primary/70'
  return 'bg-primary'
}

type Cell = {
  key: string
  date: Date
  value: number
  inRange: boolean
}

export function ActivityHeatmapGrid({
  points,
  weeks = 16,
  className = '',
}: ActivityHeatmapGridProps) {
  const { t, locale } = useI18n()

  const { cells, monthLabels, weekdayLabels, maxValue } = useMemo(() => {
    const byDate = new Map<string, number>()
    let max = 0
    for (const point of points) {
      const parsed = parsePointDate(point.date)
      if (!parsed) continue
      const key = toDateKey(parsed)
      const value = Math.max(0, Number(point.value) || 0)
      byDate.set(key, (byDate.get(key) ?? 0) + value)
      max = Math.max(max, byDate.get(key) ?? 0)
    }

    const today = startOfLocalDay(new Date())
    const end = startOfWeekSunday(today)
    end.setDate(end.getDate() + 6)
    const start = addDays(startOfWeekSunday(today), -(weeks - 1) * 7)

    const nextCells: Cell[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = toDateKey(cursor)
      const value = byDate.get(key) ?? 0
      nextCells.push({
        key,
        date: new Date(cursor),
        value,
        inRange: cursor <= today,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    const labels: Array<{ label: string; column: number }> = []
    let lastMonth = -1
    for (let week = 0; week < weeks; week += 1) {
      const weekStart = addDays(start, week * 7)
      const month = weekStart.getMonth()
      if (month !== lastMonth) {
        labels.push({
          label: weekStart.toLocaleDateString(locale, { month: 'short' }),
          column: week + 2,
        })
        lastMonth = month
      }
    }

    const weekdaySample = Array.from({ length: 7 }, (_, weekday) => {
      const sample = addDays(start, weekday)
      return sample.toLocaleDateString(locale, { weekday: 'narrow' })
    })

    return {
      cells: nextCells,
      monthLabels: labels,
      weekdayLabels: weekdaySample,
      maxValue: max,
    }
  }, [locale, points, weeks])

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('analytics.noActivity')}</p>
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="overflow-x-auto pb-1">
        <div
          className="inline-grid gap-1"
          style={{
            gridTemplateColumns: `auto repeat(${weeks}, minmax(0.7rem, 0.9rem))`,
            gridTemplateRows: `auto repeat(7, minmax(0.7rem, 0.9rem))`,
          }}
          role="img"
          aria-label={t('analytics.heatmapLabel')}
        >
          <span className="col-start-1 row-start-1" aria-hidden />
          {monthLabels.map((month) => (
            <span
              key={`${month.label}-${month.column}`}
              className="self-end truncate text-[10px] text-muted-foreground"
              style={{ gridColumn: month.column, gridRow: 1 }}
            >
              {month.label}
            </span>
          ))}

          {weekdayLabels.map((label, index) => (
            <span
              key={`wd-${index}`}
              className="pe-1 text-end text-[10px] leading-none text-muted-foreground"
              style={{ gridColumn: 1, gridRow: index + 2 }}
              aria-hidden={index % 2 === 1}
            >
              {index % 2 === 0 ? label : ''}
            </span>
          ))}

          {cells.map((cell, index) => {
            const week = Math.floor(index / 7)
            const weekday = index % 7
            const title = `${cell.date.toLocaleDateString(locale, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })} · ${t('analytics.activityCount', { count: cell.value })}`
            return (
              <span
                key={cell.key}
                title={title}
                aria-label={title}
                className={`rounded-[3px] ${
                  cell.inRange ? intensityClass(cell.value, maxValue) : 'bg-transparent'
                }`}
                style={{ gridColumn: week + 2, gridRow: weekday + 2 }}
              />
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        <span>{t('analytics.heatmapLess')}</span>
        <span className="inline-flex items-center gap-1" aria-hidden>
          <span className="size-2.5 rounded-[2px] bg-muted" />
          <span className="size-2.5 rounded-[2px] bg-primary/25" />
          <span className="size-2.5 rounded-[2px] bg-primary/45" />
          <span className="size-2.5 rounded-[2px] bg-primary/70" />
          <span className="size-2.5 rounded-[2px] bg-primary" />
        </span>
        <span>{t('analytics.heatmapMore')}</span>
      </div>
    </div>
  )
}
