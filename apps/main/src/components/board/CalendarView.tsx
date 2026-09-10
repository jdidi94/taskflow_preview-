import { useMemo, useState } from 'react'
import { Badge, Button } from '@taskflow/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { ColumnQuickAdd } from '@/components/board/ColumnQuickAdd'
import { dueDateToInput } from '@/components/board/taskHelpers'
import { PRIORITY_BORDER, PRIORITY_BADGE, PRIORITY_KEYS } from '@/components/board/priorityStyles'
import { PriorityRail } from '@/components/board/PriorityRail'
import { useI18n, type Locale } from '@/i18n'
import type { Task } from '@/types/domain'

type CalendarViewProps = {
  tasks: Task[]
  onEditTask: (task: Task) => void
  highlightedTaskId?: string | null
  onQuickCreateOnDate?: (dateKey: string, title: string) => Promise<void>
  onCreateOnDate?: (dateKey: string) => void
  disabled?: boolean
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function dateKeyFromParts(year: number, monthIndex: number, day: number) {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/** Weekday index 0=Sun … 6=Sat matching `Date.getDay()`. */
function weekStartsOn(locale: Locale): number {
  try {
    const info = (new Intl.Locale(locale) as Intl.Locale & { weekInfo?: { firstDay?: number } })
      .weekInfo
    // Intl: 1=Mon … 7=Sun
    if (info?.firstDay) return info.firstDay === 7 ? 0 : info.firstDay
  } catch {
    // fall through
  }
  return locale === 'en' ? 0 : 1
}

function buildMonthCells(cursor: Date, locale: Locale) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = startOfMonth(cursor)
  const startDow = weekStartsOn(locale)
  const offset = (first.getDay() - startDow + 7) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7

  const cells: Array<{ key: string; day: number; inMonth: boolean; date: Date }> = []
  for (let i = 0; i < totalCells; i++) {
    const dayNumber = i - offset + 1
    const date = new Date(year, month, dayNumber)
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth
    cells.push({
      key: dateKeyFromParts(date.getFullYear(), date.getMonth(), date.getDate()),
      day: date.getDate(),
      inMonth,
      date,
    })
  }
  return cells
}

function weekdayLabels(locale: Locale) {
  const start = weekStartsOn(locale)
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-07 is a Sunday
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(2024, 0, 7 + ((start + index) % 7))
    return formatter.format(day)
  })
}

export function CalendarView({
  tasks,
  onEditTask,
  highlightedTaskId,
  onQuickCreateOnDate,
  onCreateOnDate,
  disabled,
}: CalendarViewProps) {
  const { t, locale } = useI18n()
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [addingDate, setAddingDate] = useState<string | null>(null)

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor),
    [cursor, locale],
  )

  const weekdays = useMemo(() => weekdayLabels(locale), [locale])
  const cells = useMemo(() => buildMonthCells(cursor, locale), [cursor, locale])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks) {
      const key = dueDateToInput(task.dueDate)
      if (!key) continue
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(task)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.title.localeCompare(b.title))
    }
    return map
  }, [tasks])

  const undated = useMemo(() => tasks.filter((task) => !dueDateToInput(task.dueDate)), [tasks])

  const todayKey = dueDateToInput(new Date().toISOString())

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t('board.calendarPrev')}
            onClick={() => setCursor((prev) => addMonths(prev, -1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCursor(startOfMonth(new Date()))}>
            {t('board.calendarToday')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-label={t('board.calendarNext')}
            onClick={() => setCursor((prev) => addMonths(prev, 1))}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40">
          {weekdays.map((label) => (
            <div
              key={label}
              className="px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayTasks = cell.inMonth ? (tasksByDate.get(cell.key) ?? []) : []
            const visible = dayTasks.slice(0, 3)
            const overflow = dayTasks.length - visible.length
            const isToday = cell.key === todayKey

            return (
              <div
                key={`${cell.key}-${cell.inMonth ? 'm' : 'o'}`}
                className={`min-h-24 border-e border-b border-border/50 p-1 sm:min-h-28 sm:p-1.5 ${
                  cell.inMonth ? 'bg-background' : 'bg-muted/20'
                } ${isToday ? 'bg-primary/5' : ''}`}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : cell.inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/60'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.inMonth && (onQuickCreateOnDate || onCreateOnDate) && !disabled ? (
                    <button
                      type="button"
                      className="rounded px-1 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() =>
                        onQuickCreateOnDate ? setAddingDate(cell.key) : onCreateOnDate?.(cell.key)
                      }
                    >
                      +
                    </button>
                  ) : null}
                </div>
                {addingDate === cell.key && onQuickCreateOnDate ? (
                  <div className="mb-1">
                    <ColumnQuickAdd
                      compact
                      autoOpen
                      disabled={disabled}
                      onSubmit={(title) => onQuickCreateOnDate(cell.key, title)}
                      onMore={
                        onCreateOnDate
                          ? () => {
                              setAddingDate(null)
                              onCreateOnDate(cell.key)
                            }
                          : undefined
                      }
                      onClose={() => setAddingDate(null)}
                    />
                  </div>
                ) : null}
                <ul className="flex flex-col gap-0.5">
                  {visible.map((task) => (
                    <li key={task.id}>
                      <button
                        type="button"
                        className={`w-full truncate rounded border-s-[3px] px-1 py-0.5 text-start text-[10px] font-medium hover:bg-muted sm:text-xs ${PRIORITY_BORDER[task.priority]} ${
                          highlightedTaskId === task.id ? 'bg-primary/15 ring-1 ring-primary/50' : ''
                        }`}
                        title={`${task.title} · ${t(PRIORITY_KEYS[task.priority])}`}
                        onClick={() => onEditTask(task)}
                      >
                        {task.title}
                      </button>
                    </li>
                  ))}
                  {overflow > 0 ? (
                    <li className="px-1 text-[10px] text-muted-foreground">
                      {t('board.calendarMore', { count: overflow })}
                    </li>
                  ) : null}
                </ul>
              </div>
            )
          })}
        </div>
      </div>

      {undated.length > 0 ? (
        <section className="overflow-hidden rounded-xl border border-border/70">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
            <h3 className="text-sm font-semibold">{t('board.calendarUndated')}</h3>
            <Badge variant="secondary">{undated.length}</Badge>
          </div>
          <ul className="divide-y divide-border/60">
            {undated.map((task) => {
              const priorityLabel = t(PRIORITY_KEYS[task.priority])
              return (
                <li
                  key={task.id}
                  className={`relative flex flex-wrap items-center justify-between gap-3 py-2.5 pe-3 ps-4 ${
                    highlightedTaskId === task.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <PriorityRail priority={task.priority} />
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${PRIORITY_BADGE[task.priority]}`}
                      aria-label={priorityLabel}
                    >
                      {priorityLabel}
                    </Badge>
                    <Button type="button" size="sm" variant="ghost" onClick={() => onEditTask(task)}>
                      {t('board.edit')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
