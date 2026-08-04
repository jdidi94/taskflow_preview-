import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useState } from 'react'

import { KanbanColumn } from '@/components/board/KanbanColumn'
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
  onAddTask: (columnId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDeleteColumn: (column: BoardColumn) => void
}

export function KanbanBoard({
  columns,
  tasksByColumn,
  members,
  onMoveTask,
  onReorderColumns,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [activeColumn, setActiveColumn] = useState<BoardColumn | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={columns.map((c) => `sort-col-${c.id}`)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByColumn.get(column.id) ?? []}
              members={members}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onDeleteColumn={onDeleteColumn}
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
