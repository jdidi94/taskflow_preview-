import type { BoardColumn, Task } from '@/types/domain'

const DAY_MS = 86_400_000

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function addLocalDays(date: Date, days: number): Date {
  const next = startOfLocalDay(date)
  next.setDate(next.getDate() + days)
  return next
}

export function dayIndexFromStart(start: Date, date: Date): number {
  return Math.round((startOfLocalDay(date).getTime() - startOfLocalDay(start).getTime()) / DAY_MS)
}

export type TimelineRange = {
  start: Date
  dayCount: number
  todayIndex: number | null
}

/** Inclusive range covering all due dates, padded, at least `minDays` wide. */
export function buildTimelineRange(tasks: Task[], now = new Date(), minDays = 14): TimelineRange | null {
  const dated = tasks
    .map((task) => (task.dueDate ? startOfLocalDay(new Date(task.dueDate)) : null))
    .filter((d): d is Date => Boolean(d) && !Number.isNaN(d.getTime()))

  if (dated.length === 0) return null

  let min = dated[0]!
  let max = dated[0]!
  for (const d of dated) {
    if (d < min) min = d
    if (d > max) max = d
  }

  const today = startOfLocalDay(now)
  if (today < min) min = today
  if (today > max) max = today

  min = addLocalDays(min, -1)
  max = addLocalDays(max, 2)

  let dayCount = dayIndexFromStart(min, max) + 1
  if (dayCount < minDays) {
    const extra = minDays - dayCount
    const before = Math.floor(extra / 2)
    const after = extra - before
    min = addLocalDays(min, -before)
    max = addLocalDays(max, after)
    dayCount = dayIndexFromStart(min, max) + 1
  }

  const todayIndex = dayIndexFromStart(min, today)
  return {
    start: min,
    dayCount,
    todayIndex: todayIndex >= 0 && todayIndex < dayCount ? todayIndex : null,
  }
}

export type TimelineLane = {
  id: string
  name: string
  tasks: Task[]
}

export function buildTimelineLanes(columns: BoardColumn[], tasks: Task[]): TimelineLane[] {
  const dated = tasks.filter((task) => task.dueDate)
  const byColumn = new Map<string, Task[]>()
  for (const task of dated) {
    const colId = String(task.column)
    const list = byColumn.get(colId) ?? []
    list.push(task)
    byColumn.set(colId, list)
  }

  const lanes: TimelineLane[] = columns.map((column) => ({
    id: column.id,
    name: column.name,
    tasks: (byColumn.get(column.id) ?? []).sort(
      (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
    ),
  }))

  const known = new Set(columns.map((c) => c.id))
  const orphans = dated.filter((task) => !known.has(String(task.column)))
  if (orphans.length > 0) {
    lanes.push({
      id: '__other__',
      name: '',
      tasks: orphans.sort(
        (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime(),
      ),
    })
  }

  return lanes
}

/** Stack same-day markers into rows within a lane. */
export function packLaneRows(
  tasks: Task[],
  rangeStart: Date,
): { task: Task; day: number; row: number; rowCount: number }[] {
  const counts = new Map<number, number>()
  const packed: { task: Task; day: number; row: number }[] = []

  for (const task of tasks) {
    const day = dayIndexFromStart(rangeStart, new Date(task.dueDate!))
    const row = counts.get(day) ?? 0
    counts.set(day, row + 1)
    packed.push({ task, day, row })
  }

  let rowCount = 1
  for (const n of counts.values()) rowCount = Math.max(rowCount, n)
  return packed.map((item) => ({ ...item, rowCount }))
}
