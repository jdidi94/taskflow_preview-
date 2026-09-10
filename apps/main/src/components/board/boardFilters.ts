import { dueToneFromIso } from '@/components/board/DueChip'
import { taskAssigneeIds } from '@/components/board/taskHelpers'
import type { Task, TaskPriority } from '@/types/domain'

export type BoardDueFilter = 'all' | 'overdue' | 'today' | 'week' | 'undated'
export type BoardPriorityFilter = 'all' | TaskPriority

export type BoardFilters = {
  q: string
  assignee: string
  due: BoardDueFilter
  priority: BoardPriorityFilter
}

export const EMPTY_BOARD_FILTERS: BoardFilters = {
  q: '',
  assignee: 'all',
  due: 'all',
  priority: 'all',
}

const DUE_VALUES: BoardDueFilter[] = ['all', 'overdue', 'today', 'week', 'undated']
const PRIORITY_VALUES: BoardPriorityFilter[] = ['all', 'low', 'medium', 'high', 'critical']

export function parseBoardFilters(params: URLSearchParams): BoardFilters {
  const dueRaw = params.get('due')?.trim() ?? 'all'
  const priorityRaw = params.get('priority')?.trim() ?? 'all'
  return {
    q: params.get('q')?.trim() ?? '',
    assignee: params.get('assignee')?.trim() || 'all',
    due: DUE_VALUES.includes(dueRaw as BoardDueFilter) ? (dueRaw as BoardDueFilter) : 'all',
    priority: PRIORITY_VALUES.includes(priorityRaw as BoardPriorityFilter)
      ? (priorityRaw as BoardPriorityFilter)
      : 'all',
  }
}

export function writeBoardFilters(params: URLSearchParams, filters: BoardFilters) {
  const next = new URLSearchParams(params)
  const q = filters.q.trim()
  if (q) next.set('q', q)
  else next.delete('q')

  if (filters.assignee && filters.assignee !== 'all') next.set('assignee', filters.assignee)
  else next.delete('assignee')

  if (filters.due !== 'all') next.set('due', filters.due)
  else next.delete('due')

  if (filters.priority !== 'all') next.set('priority', filters.priority)
  else next.delete('priority')

  return next
}

export function boardFiltersActive(filters: BoardFilters) {
  return (
    Boolean(filters.q.trim()) ||
    filters.assignee !== 'all' ||
    filters.due !== 'all' ||
    filters.priority !== 'all'
  )
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function matchesDue(task: Task, due: BoardDueFilter, now: Date) {
  if (due === 'all') return true
  if (!task.dueDate) return due === 'undated'
  if (due === 'undated') return false

  const tone = dueToneFromIso(task.dueDate, now)
  if (due === 'overdue') return tone === 'overdue'
  if (due === 'today') return tone === 'today'

  const startToday = startOfDay(now)
  const endWeek = new Date(startToday)
  endWeek.setDate(endWeek.getDate() + 6)
  const dueDay = startOfDay(new Date(task.dueDate))
  return dueDay >= startToday && dueDay <= endWeek
}

function matchesAssignee(task: Task, assignee: string, currentUserId?: string) {
  if (assignee === 'all') return true
  const ids = taskAssigneeIds(task)
  if (assignee === 'unassigned') return ids.length === 0
  if (assignee === 'me') return Boolean(currentUserId) && ids.includes(currentUserId!)
  return ids.includes(assignee)
}

export function filterBoardTasks(tasks: Task[], filters: BoardFilters, currentUserId?: string) {
  const query = filters.q.trim().toLowerCase()
  const now = new Date()

  return tasks.filter((task) => {
    if (query) {
      const hay = `${task.title} ${(task.tags ?? []).join(' ')}`.toLowerCase()
      const tokens = query.split(/\s+/).filter(Boolean)
      if (!tokens.every((token) => hay.includes(token))) return false
    }
    if (!matchesAssignee(task, filters.assignee, currentUserId)) return false
    if (!matchesDue(task, filters.due, now)) return false
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false
    return true
  })
}
