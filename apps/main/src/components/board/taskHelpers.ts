import type { Task, TaskChecklistItem, TaskUserRef } from '@/types/domain'

export function assigneeId(value: string | TaskUserRef | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return String(value.id ?? '')
}

export function assigneeLabel(value: string | TaskUserRef | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.name?.trim() || value.email?.trim() || value.id
}

export function taskAssigneeIds(task: Task | null | undefined): string[] {
  return (task?.assignees ?? []).map((a) => assigneeId(a)).filter(Boolean)
}

/** Convert HTML date (yyyy-mm-dd) ↔ API ISO datetime. */
export function dueDateToInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

export function dueDateFromInput(dateOnly: string): string | null {
  if (!dateOnly.trim()) return null
  return new Date(`${dateOnly.trim()}T12:00:00.000Z`).toISOString()
}

export function normalizeChecklist(
  items: TaskChecklistItem[] | undefined,
): TaskChecklistItem[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    text: item.text,
    done: Boolean(item.done),
  }))
}

export const TASK_COLORS = [
  '#6B7280',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#0891B2',
  '#4B5563',
] as const
