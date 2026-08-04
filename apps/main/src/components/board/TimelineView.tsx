import { useMemo } from 'react'
import { Badge } from '@taskflow/ui'

import { BoardDenseTaskRow } from '@/components/board/BoardDenseTaskRow'
import { PRIORITY_RAIL } from '@/components/board/priorityStyles'
import {
  addLocalDays,
  buildTimelineLanes,
  buildTimelineRange,
  packLaneRows,
} from '@/components/board/timelineHelpers'
import { useI18n } from '@/i18n'
import type { BoardColumn, Task, TaskPriority } from '@/types/domain'

const LANE_LABEL_W = 148
const DAY_W = 44
const ROW_H = 28
const BAR_H = 22

const BAR_TEXT: Record<TaskPriority, string> = {
  low: 'text-foreground',
  medium: 'text-primary-foreground',
  high: 'text-foreground',
  critical: 'text-destructive-foreground',
}

type TimelineViewProps = {
  tasks: Task[]
  columns: BoardColumn[]
  onEditTask: (task: Task) => void
}

export function TimelineView({ tasks, columns, onEditTask }: TimelineViewProps) {
  const { t, locale } = useI18n()

  const range = useMemo(() => buildTimelineRange(tasks), [tasks])
  const lanes = useMemo(() => buildTimelineLanes(columns, tasks), [columns, tasks])
  const undated = useMemo(() => tasks.filter((task) => !task.dueDate), [tasks])
  const datedCount = tasks.length - undated.length

  const days = useMemo(() => {
    if (!range) return []
    return Array.from({ length: range.dayCount }, (_, i) => addLocalDays(range.start, i))
  }, [range])

  const chartWidth = range ? range.dayCount * DAY_W : 0

  return (
    <div className="flex flex-col gap-3">
      <section className="rounded-xl border border-border/70 bg-card/30">
        <header className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-border/60 bg-background/90 px-3 py-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold tracking-tight">{t('board.timelineTitle')}</h2>
            <p className="text-[11px] text-muted-foreground">{t('board.timelineHint')}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 tabular-nums text-[10px]">
            {datedCount}
          </Badge>
        </header>

        {!range ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t('board.timelineEmpty')}</p>
        ) : (
          <div className="max-h-[min(70vh,36rem)] overflow-auto">
            <div style={{ minWidth: LANE_LABEL_W + chartWidth }} className="relative">
              <div className="sticky top-0 z-10 flex border-b border-border/60 bg-background/95 backdrop-blur-sm">
                <div
                  className="sticky start-0 z-[2] shrink-0 border-e border-border/60 bg-background/95 px-2.5 py-2"
                  style={{ width: LANE_LABEL_W }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t('board.timelineAxisLane')}
                  </span>
                </div>
                {days.map((day, index) => {
                  const isToday = range.todayIndex === index
                  const isMonthStart = day.getDate() === 1 || index === 0
                  return (
                    <div
                      key={day.toISOString()}
                      className={`flex shrink-0 flex-col items-center justify-end gap-0.5 border-e border-border/40 py-1.5 ${
                        isToday ? 'bg-primary/10' : ''
                      }`}
                      style={{ width: DAY_W }}
                      title={
                        isToday
                          ? t('board.timelineToday')
                          : day.toLocaleDateString(locale, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                      }
                    >
                      {isMonthStart ? (
                        <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          {day.toLocaleDateString(locale, { month: 'short' })}
                        </span>
                      ) : (
                        <span className="h-3" aria-hidden />
                      )}
                      <span
                        className={`text-[10px] tabular-nums ${
                          isToday ? 'font-semibold text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {isToday ? t('board.timelineTodayShort') : day.getDate()}
                      </span>
                    </div>
                  )
                })}
              </div>

              {lanes.map((lane) => {
                const packed = packLaneRows(lane.tasks, range.start)
                const rowCount = packed.reduce((max, item) => Math.max(max, item.row + 1), 1)
                const trackH = Math.max(ROW_H + 8, rowCount * ROW_H + 8)
                const label =
                  lane.id === '__other__' ? t('board.timelineOtherLane') : lane.name

                return (
                  <div
                    key={lane.id}
                    className="flex border-b border-border/50 last:border-b-0"
                    style={{ minHeight: trackH }}
                  >
                    <div
                      className="sticky start-0 z-[5] flex shrink-0 items-center gap-1.5 border-e border-border/60 bg-background/95 px-2.5 backdrop-blur-sm"
                      style={{ width: LANE_LABEL_W }}
                    >
                      <p className="min-w-0 flex-1 truncate text-xs font-medium" title={label}>
                        {label}
                      </p>
                      <Badge variant="outline" className="shrink-0 tabular-nums text-[9px]">
                        {lane.tasks.length}
                      </Badge>
                    </div>

                    <div className="relative" style={{ width: chartWidth, minHeight: trackH }}>
                      <div className="pointer-events-none absolute inset-0 flex" aria-hidden>
                        {days.map((day, index) => (
                          <div
                            key={day.toISOString()}
                            className={`h-full border-e border-border/30 ${
                              range.todayIndex === index ? 'bg-primary/5' : ''
                            }`}
                            style={{ width: DAY_W }}
                          />
                        ))}
                      </div>

                      {range.todayIndex != null ? (
                        <div
                          className="pointer-events-none absolute inset-y-1 z-[1] w-px bg-primary/70"
                          style={{ insetInlineStart: range.todayIndex * DAY_W + DAY_W / 2 }}
                          aria-hidden
                        />
                      ) : null}

                      {lane.tasks.length === 0 ? (
                        <p className="relative z-[1] flex h-full min-h-[2rem] items-center px-2 text-[10px] text-muted-foreground/70">
                          {t('board.timelineLaneEmpty')}
                        </p>
                      ) : (
                        packed.map(({ task, day, row }) => {
                          if (day < 0 || day >= range.dayCount) return null
                          return (
                            <button
                              key={task.id}
                              type="button"
                              title={task.title}
                              onClick={() => onEditTask(task)}
                              className={`absolute z-[2] truncate rounded-md border border-background/30 px-1.5 text-start text-[10px] font-medium shadow-sm transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${PRIORITY_RAIL[task.priority]} ${BAR_TEXT[task.priority]}`}
                              style={{
                                insetInlineStart: day * DAY_W + 2,
                                top: 4 + row * ROW_H,
                                width: Math.max(DAY_W - 4, 36),
                                height: BAR_H,
                                lineHeight: `${BAR_H}px`,
                              }}
                            >
                              {task.title}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {undated.length > 0 ? (
        <section className="rounded-xl border border-border/70 bg-card/30">
          <header className="sticky top-14 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 py-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
            <h2 className="truncate text-sm font-semibold tracking-tight">
              {t('board.timelineUndated')}
            </h2>
            <Badge variant="secondary" className="shrink-0 tabular-nums text-[10px]">
              {undated.length}
            </Badge>
          </header>
          <ul className="divide-y divide-border/50">
            {undated.map((task) => (
              <BoardDenseTaskRow key={task.id} task={task} onEdit={onEditTask} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
