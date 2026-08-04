import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge, Button } from '@taskflow/ui'
import { GripVertical, Plus, Trash2 } from 'lucide-react'

import { TaskCard } from '@/components/board/TaskCard'
import { ColumnWipMeter } from '@/components/board/ColumnWipMeter'
import { useI18n } from '@/i18n'
import type { NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import type { BoardColumn, Task } from '@/types/domain'

type KanbanColumnProps = {
  column: BoardColumn
  tasks: Task[]
  members?: NormalizedWorkspaceMember[]
  onAddTask: (columnId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDeleteColumn: (column: BoardColumn) => void
}

export function KanbanColumn({
  column,
  tasks,
  members,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { t } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `sort-col-${column.id}`,
    data: { type: 'column', column },
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  const overWip = column.limit != null && column.limit > 0 && tasks.length > column.limit

  return (
    <section
      ref={(node) => {
        setSortableRef(node)
        setDroppableRef(node)
      }}
      style={style}
      className={`flex min-h-[28rem] w-72 shrink-0 flex-col rounded-xl border bg-muted/35 p-3 ${
        overWip ? 'border-destructive/50' : 'border-border/70'
      } ${isOver ? 'ring-2 ring-primary/40' : ''}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <button
            type="button"
            className="inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
            title={t('board.reorderColumn')}
            aria-label={t('board.reorderColumn')}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          <h2 className="truncate text-sm font-semibold">{column.name}</h2>
          <Badge
            variant={overWip ? 'error' : 'secondary'}
            className="tabular-nums"
            title={
              column.limit != null && column.limit > 0
                ? overWip
                  ? t('board.wipOverLimit', { count: tasks.length, limit: column.limit })
                  : t('board.wipMeter', { count: tasks.length, limit: column.limit })
                : undefined
            }
          >
            {column.limit != null && column.limit > 0
              ? `${tasks.length}/${column.limit}`
              : tasks.length}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
          title={t('board.deleteColumn')}
          aria-label={t('board.deleteColumn')}
          onClick={() => onDeleteColumn(column)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ColumnWipMeter count={tasks.length} limit={column.limit} />
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </SortableContext>
      <Button
        className="mt-3 gap-1.5"
        size="sm"
        variant="outline"
        onClick={() => onAddTask(column.id)}
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        {t('board.addTask')}
      </Button>
    </section>
  )
}
