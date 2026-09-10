export const BOARD_FILTER_SEARCH_ID = 'board-filter-search'

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"]'))
}

export function hasBlockingOverlay(): boolean {
  return Boolean(
    document.querySelector('[aria-modal="true"]') || document.querySelector('.tf-modal-overlay'),
  )
}

export function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[role="dialog"]'))
}

export function focusBoardFilter() {
  const input = document.getElementById(BOARD_FILTER_SEARCH_ID)
  if (!(input instanceof HTMLInputElement)) return
  input.focus()
  input.select()
}

export function focusTaskCard(taskId: string) {
  const node = document.querySelector<HTMLElement>(`[data-task-card="${CSS.escape(taskId)}"]`)
  node?.focus()
}

export function nextRovingTaskId(args: {
  columns: Array<{ id: string }>
  tasksByColumn: Map<string, Array<{ id: string }>>
  currentId: string | null
  direction: 'up' | 'down' | 'prevColumn' | 'nextColumn'
}): string | null {
  const columnTasks = args.columns.map((column) => ({
    id: column.id,
    tasks: args.tasksByColumn.get(column.id) ?? [],
  }))
  const flat = columnTasks.flatMap((column) => column.tasks.map((task) => ({ columnId: column.id, taskId: task.id })))
  if (flat.length === 0) return null

  const currentIndex = args.currentId ? flat.findIndex((item) => item.taskId === args.currentId) : -1
  const current = currentIndex >= 0 ? flat[currentIndex] : flat[0]
  const columnIndex = columnTasks.findIndex((column) => column.id === current.columnId)
  const column = columnTasks[columnIndex]
  const indexInColumn = column.tasks.findIndex((task) => task.id === current.taskId)

  if (args.direction === 'down') {
    if (indexInColumn < column.tasks.length - 1) return column.tasks[indexInColumn + 1].id
    return current.taskId
  }
  if (args.direction === 'up') {
    if (indexInColumn > 0) return column.tasks[indexInColumn - 1].id
    return current.taskId
  }

  const nextColumnIndex =
    args.direction === 'nextColumn'
      ? Math.min(columnIndex + 1, columnTasks.length - 1)
      : Math.max(columnIndex - 1, 0)
  const nextColumn = columnTasks[nextColumnIndex]
  if (nextColumn.tasks.length === 0) return current.taskId
  return nextColumn.tasks[Math.min(indexInColumn, nextColumn.tasks.length - 1)]?.id ?? current.taskId
}
