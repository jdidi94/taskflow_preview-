import { dueToneFromIso } from '@/components/board/DueChip'
import type { AssignedTask } from '@/types/domain'

export const MY_TASKS_DUE_SOON_DAYS = 14

export type WorkspaceTaskGroup = {
  workspaceId: string
  workspaceName: string | null
  tasks: AssignedTask[]
}

export type GroupedMyTasks = {
  overdue: AssignedTask[]
  dueSoon: AssignedTask[]
  byWorkspace: WorkspaceTaskGroup[]
}

function dueDiffDays(iso: string, now: Date): number | null {
  const due = new Date(iso)
  if (Number.isNaN(due.getTime())) return null
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  return Math.round((startDue.getTime() - startToday.getTime()) / 86_400_000)
}

function sortAssigned(a: AssignedTask, b: AssignedTask) {
  if (!a.dueDate && !b.dueDate) return a.title.localeCompare(b.title)
  if (!a.dueDate) return 1
  if (!b.dueDate) return -1
  const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  if (diff !== 0) return diff
  return a.title.localeCompare(b.title)
}

export function groupMyTasks(tasks: AssignedTask[], now = new Date()): GroupedMyTasks {
  const overdue: AssignedTask[] = []
  const dueSoon: AssignedTask[] = []
  const workspaceMap = new Map<string, WorkspaceTaskGroup>()

  for (const task of tasks) {
    if (task.dueDate && dueToneFromIso(task.dueDate, now) === 'overdue') {
      overdue.push(task)
    }
    const diff = task.dueDate ? dueDiffDays(task.dueDate, now) : null
    if (diff != null && diff >= 0 && diff <= MY_TASKS_DUE_SOON_DAYS) {
      dueSoon.push(task)
    }

    const workspaceId = task.workspaceId?.trim() || 'unknown'
    const existing = workspaceMap.get(workspaceId)
    if (existing) {
      existing.tasks.push(task)
    } else {
      workspaceMap.set(workspaceId, {
        workspaceId,
        workspaceName: task.workspaceName ?? null,
        tasks: [task],
      })
    }
  }

  const byWorkspace = [...workspaceMap.values()].sort((a, b) => {
    const nameA = (a.workspaceName || a.workspaceId).toLowerCase()
    const nameB = (b.workspaceName || b.workspaceId).toLowerCase()
    return nameA.localeCompare(nameB)
  })
  for (const group of byWorkspace) group.tasks.sort(sortAssigned)

  return {
    overdue: overdue.sort(sortAssigned),
    dueSoon: dueSoon.sort(sortAssigned),
    byWorkspace,
  }
}
