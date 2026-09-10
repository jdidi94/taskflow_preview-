import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useReducedMotion } from 'framer-motion'
import { useEffect, useState, type KeyboardEvent } from 'react'

import { focusTaskCard, nextRovingTaskId } from '@/components/board/boardKeyboard'
import { KanbanColumn } from '@/components/board/KanbanColumn'
import { useI18n } from '@/i18n'
import type { NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import type { BoardColumn, Task } from '@/types/domain'

function columnIdOf(task: Task) {
  return String(task.column)
}

function parseSortColId(id: string | number): string | null {
  const value = String(id)
  if (value.startsWith('sort-col-')) return value.slice('sort-col-'.length)
  return null
}

type KanbanBoardProps = {
  columns: BoardColumn[]
  tasksByColumn: Map<string, Task[]>
  members?: NormalizedWorkspaceMember[]
  onMoveTask: (args: {
    task: Task
    targetColumnId: string
    position: number
  }) => void | Promise<void>
  onReorderColumns: (columnIds: string[]) => void | Promise<void>
  onQuickAdd: (columnId: string, title: string) => Promise<void>
  onAddTaskMore?: (columnId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDeleteColumn: (column: BoardColumn) => void
  highlightedTaskId?: string | null
  focusedColumnId?: string | null
  onFocusColumn?: (columnId: string) => void
  quickAddColumnId?: string | null
  onQuickAddColumnChange?: (columnId: string | null) => void
  disabled?: boolean
}

export function KanbanBoard({
  columns,
  tasksByColumn,
  members,
  onMoveTask,
  onReorderColumns,
  onQuickAdd,
  onAddTaskMore,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
  highlightedTaskId,
  focusedColumnId,
  onFocusColumn,
  quickAddColumnId,
  onQuickAddColumnChange,
  disabled,
}: KanbanBoardProps) {
  const { isRTL } = useI18n()
  const reduceMotion = useReducedMotion()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null)
  const [rovingTaskId, setRovingTaskId] = useState<string | null>(null)

  useEffect(() => {
    const ids = new Set(
      [...tasksByColumn.values()].flatMap((list) => list.map((task) => task.id)),
    )
    if (rovingTaskId && ids.has(rovingTaskId)) return
    const firstColumn = focusedColumnId
      ? tasksByColumn.get(focusedColumnId)
      : tasksByColumn.get(columns[0]?.id ?? '')
    setRovingTaskId(firstColumn?.[0]?.id ?? [...ids][0] ?? null)
  }, [columns, focusedColumnId, rovingTaskId, tasksByColumn])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Nested task sortables steal column collisions — prefer column targets while reordering columns.
  const collisionDetection: CollisionDetection = (args) => {
    if (args.active.data.current?.type === 'column') {
      const columnContainers = args.droppableContainers.filter((container) => {
        const type = container.data.current?.type
        return type === 'column' || String(container.id).startsWith('sort-col-')
      })
      return closestCenter({ ...args, droppableContainers: columnContainers })
    }
    return closestCorners(args)
  }

  function onDragStart(event: DragStartEvent) {
    const type = event.active.data.current?.type
    if (type === 'column') {
      setActiveColumn((event.active.data.current?.column as BoardColumn | undefined) ?? null)
      setActiveTask(null)
      return
    }
    const task = event.active.data.current?.task as Task | undefined
    setActiveTask(task ?? null)
    setActiveColumn(null)
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const type = active.data.current?.type
    setActiveTask(null)
    setActiveColumn(null)
    if (!over) return

    if (type === 'column') {
      const activeColId = parseSortColId(active.id)
      if (!activeColId) return

      let overColId = parseSortColId(over.id)
      if (!overColId && over.data.current?.type === 'column') {
        overColId = (over.data.current.column as BoardColumn).id
      }
      if (!overColId && over.data.current?.type === 'column-drop') {
        overColId = String(over.data.current.columnId)
      }
      if (!overColId && over.data.current?.type === 'task') {
        overColId = columnIdOf(over.data.current.task as Task)
      }
      if (!overColId) return

      const oldIndex = columns.findIndex((c) => c.id === activeColId)
      const newIndex = columns.findIndex((c) => c.id === overColId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return

      const next = arrayMove(
        columns.map((c) => c.id),
        oldIndex,
        newIndex,
      )
      void onReorderColumns(next)
      return
    }

    const activeTaskData = active.data.current?.task as Task | undefined
    if (!activeTaskData) return

    let targetColumnId = columnIdOf(activeTaskData)
    const overData = over.data.current

    if (overData?.type === 'column-drop' || overData?.type === 'column') {
      targetColumnId = String(
        overData.columnId ?? (overData.column as BoardColumn | undefined)?.id ?? targetColumnId,
      )
    } else if (overData?.type === 'task') {
      targetColumnId = columnIdOf(overData.task as Task)
    } else if (String(over.id).startsWith('column:')) {
      targetColumnId = String(over.id).replace(/^column:/, '')
    } else if (parseSortColId(over.id)) {
      targetColumnId = parseSortColId(over.id)!
    } else {
      for (const list of tasksByColumn.values()) {
        const overTask = list.find((task) => task.id === String(over.id))
        if (overTask) {
          targetColumnId = columnIdOf(overTask)
          break
        }
      }
    }

    const columnTasks = [...(tasksByColumn.get(targetColumnId) ?? [])].filter(
      (task) => task.id !== activeTaskData.id,
    )

    let position = columnTasks.length
    if (overData?.type === 'task') {
      const overTask = overData.task as Task
      const index = columnTasks.findIndex((task) => task.id === overTask.id)
      position = index >= 0 ? index : columnTasks.length
    } else if (!String(over.id).startsWith('column:') && !parseSortColId(over.id)) {
      const index = columnTasks.findIndex((task) => task.id === String(over.id))
      if (index >= 0) position = index
    }

    if (columnIdOf(activeTaskData) === targetColumnId && activeTaskData.position === position) {
      return
    }

    void onMoveTask({
      task: activeTaskData,
      targetColumnId,
      position,
    })
  }

  function onBoardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (activeTask || disabled) return
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.closest('[data-task-card]')) return
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return
    }
    event.preventDefault()
    const direction =
      event.key === 'ArrowDown'
        ? 'down'
        : event.key === 'ArrowUp'
          ? 'up'
          : event.key === 'ArrowRight'
            ? isRTL
              ? 'prevColumn'
              : 'nextColumn'
            : isRTL
              ? 'nextColumn'
              : 'prevColumn'
    const nextId = nextRovingTaskId({
      columns,
      tasksByColumn,
      currentId: rovingTaskId,
      direction,
    })
    if (!nextId) return
    setRovingTaskId(nextId)
    const nextColumnId = [...tasksByColumn.entries()].find(([, list]) =>
      list.some((task) => task.id === nextId),
    )?.[0]
    if (nextColumnId) onFocusColumn?.(nextColumnId)
    requestAnimationFrame(() => focusTaskCard(nextId))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveTask(null)
        setActiveColumn(null)
      }}
    >
      <SortableContext
        items={columns.map((c) => `sort-col-${c.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        <div
          className={`flex gap-4 overflow-x-auto pb-4 max-md:scroll-ps-4 max-md:px-[max(0.5rem,calc(50vw-9rem))] ${
            reduceMotion ? '' : 'snap-x snap-mandatory md:snap-none'
          }`}
          onKeyDown={onBoardKeyDown}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              members={members}
              onQuickAdd={onQuickAdd}
              onAddTaskMore={onAddTaskMore}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onDeleteColumn={onDeleteColumn}
              highlightedTaskId={highlightedTaskId}
              focused={focusedColumnId === column.id}
              onFocusColumn={onFocusColumn}
              quickAddOpen={quickAddColumnId === column.id}
              onQuickAddOpenChange={(open) => onQuickAddColumnChange?.(open ? column.id : null)}
              rovingTaskId={rovingTaskId}
              onRovingFocus={setRovingTaskId}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeTask ? (
          <div className="w-72 rounded-lg border border-primary/40 bg-card p-3 shadow-lg">
            <p className="text-sm font-medium">{activeTask.title}</p>
          </div>
        ) : null}
        {activeColumn ? (
          <div className="w-72 rounded-xl border border-primary/40 bg-muted/80 p-3 shadow-lg">
            <p className="text-sm font-semibold">{activeColumn.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
