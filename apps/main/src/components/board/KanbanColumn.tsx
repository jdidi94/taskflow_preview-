import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Badge, Button } from '@taskflow/ui'
import { GripVertical, Trash2 } from 'lucide-react'

import { ColumnQuickAdd } from '@/components/board/ColumnQuickAdd'
import { TaskCard } from '@/components/board/TaskCard'
import { ColumnWipMeter } from '@/components/board/ColumnWipMeter'
import { useI18n } from '@/i18n'
import type { NormalizedWorkspaceMember } from '@/components/workspace/normalizeMembers'
import type { BoardColumn, Task } from '@/types/domain'

type KanbanColumnProps = {
  column: BoardColumn
  tasks: Task[]
  members?: NormalizedWorkspaceMember[]
  highlightedTaskId?: string | null
  onQuickAdd: (columnId: string, title: string) => Promise<void>
  onAddTaskMore?: (columnId: string) => void
  onEditTask: (task: Task) => void
  onDeleteTask: (task: Task) => void
  onDeleteColumn: (column: BoardColumn) => void
  focused?: boolean
  onFocusColumn?: (columnId: string) => void
  quickAddOpen?: boolean
  onQuickAddOpenChange?: (open: boolean) => void
  rovingTaskId?: string | null
  onRovingFocus?: (taskId: string) => void
  disabled?: boolean
}

export function KanbanColumn({
  column,
  tasks,
  members,
  highlightedTaskId,
  onQuickAdd,
  onAddTaskMore,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
  focused,
  onFocusColumn,
  quickAddOpen,
  onQuickAddOpenChange,
  rovingTaskId,
  onRovingFocus,
  disabled,
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
    disabled: Boolean(disabled),
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column:${column.id}`,
    data: { type: 'column-drop', columnId: column.id },
    disabled: Boolean(disabled),
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  }

  const dragHandleProps = disabled ? {} : { ...attributes, ...listeners }

  const overWip = column.limit != null && column.limit > 0 && tasks.length > column.limit

  return (
    <section
      ref={(node) => {
        setSortableRef(node)
        setDroppableRef(node)
      }}
      style={style}
      tabIndex={-1}
      aria-current={focused || undefined}
      aria-label={focused ? `${column.name} — ${t('board.focusedColumn')}` : undefined}
      onFocusCapture={() => onFocusColumn?.(column.id)}
      onPointerDownCapture={(event) => {
        const target = event.target
        if (!(target instanceof HTMLElement)) return
        if (target.closest('button, a, input, textarea, select')) return
        onFocusColumn?.(column.id)
      }}
      className={`flex min-h-[28rem] w-72 max-md:w-[min(18rem,calc(100vw-2.5rem))] shrink-0 snap-start snap-always flex-col rounded-xl border bg-muted/35 p-3 ${
        overWip ? 'border-destructive/50' : 'border-border/70'
      } ${isOver ? 'ring-2 ring-primary/40' : ''} ${focused && !isOver ? 'ring-2 ring-primary/25' : ''}`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-0.5 ${
            disabled ? '' : 'cursor-grab active:cursor-grabbing hover:bg-muted/60'
          }`}
          title={disabled ? undefined : t('board.reorderColumn')}
          {...dragHandleProps}
        >
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground"
            aria-hidden
          >
            <GripVertical className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0 truncate text-start text-sm font-semibold">{column.name}</span>
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
          disabled={disabled}
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
              highlighted={highlightedTaskId === task.id}
              rovingActive={rovingTaskId === task.id}
              onRovingFocus={onRovingFocus}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </SortableContext>
      {tasks.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{t('board.emptyColumnHint')}</p>
      ) : null}
      <ColumnQuickAdd
        disabled={disabled}
        open={quickAddOpen}
        onOpenChange={onQuickAddOpenChange}
        onSubmit={(title) => onQuickAdd(column.id, title)}
        onMore={onAddTaskMore ? () => onAddTaskMore(column.id) : undefined}
      />
    </section>
  )
}
