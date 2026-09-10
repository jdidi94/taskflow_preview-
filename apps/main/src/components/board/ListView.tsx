import { Badge } from '@taskflow/ui'

import { BoardDenseTaskRow } from '@/components/board/BoardDenseTaskRow'
import { ColumnQuickAdd } from '@/components/board/ColumnQuickAdd'
import { useI18n } from '@/i18n'
import type { BoardColumn, Task } from '@/types/domain'

type ListViewProps = {
  columns: BoardColumn[]
  tasksByColumn: Map<string, Task[]>
  onEditTask: (task: Task) => void
  highlightedTaskId?: string | null
  onQuickAdd?: (columnId: string, title: string) => Promise<void>
  onAddTaskMore?: (columnId: string) => void
  focusedColumnId?: string | null
  onFocusColumn?: (columnId: string) => void
  quickAddColumnId?: string | null
  onQuickAddColumnChange?: (columnId: string | null) => void
  disabled?: boolean
}

export function ListView({
  columns,
  tasksByColumn,
  onEditTask,
  highlightedTaskId,
  onQuickAdd,
  onAddTaskMore,
  focusedColumnId,
  onFocusColumn,
  quickAddColumnId,
  onQuickAddColumnChange,
  disabled,
}: ListViewProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      {columns.map((column) => {
        const tasks = tasksByColumn.get(column.id) ?? []
        const hasLimit = column.limit != null && column.limit > 0
        const overWip = hasLimit && tasks.length > column.limit!

        return (
          <section
            key={column.id}
            tabIndex={-1}
            aria-current={focusedColumnId === column.id || undefined}
            onFocusCapture={() => onFocusColumn?.(column.id)}
            onPointerDownCapture={() => onFocusColumn?.(column.id)}
            className={`rounded-xl border bg-card/30 ${
              focusedColumnId === column.id
                ? 'border-primary/40 ring-2 ring-primary/20'
                : 'border-border/70'
            }`}
          >
            <header className="sticky top-14 z-10 flex items-center justify-between gap-2 border-b border-border/60 bg-background/90 px-3 py-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
              <h2 className="truncate text-sm font-semibold tracking-tight">{column.name}</h2>
              <Badge
                variant={overWip ? 'error' : 'secondary'}
                className="shrink-0 tabular-nums text-[10px]"
              >
                {hasLimit ? `${tasks.length}/${column.limit}` : tasks.length}
              </Badge>
            </header>
            {tasks.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">{t('board.emptyColumnHint')}</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {tasks.map((task) => (
                  <BoardDenseTaskRow
                    key={task.id}
                    task={task}
                    highlighted={highlightedTaskId === task.id}
                    onEdit={onEditTask}
                  />
                ))}
              </ul>
            )}
            {onQuickAdd ? (
              <div className="border-t border-border/50 px-3 pb-3">
                <ColumnQuickAdd
                  disabled={disabled}
                  open={quickAddColumnId === column.id}
                  onOpenChange={(open) => onQuickAddColumnChange?.(open ? column.id : null)}
                  onSubmit={(title) => onQuickAdd(column.id, title)}
                  onMore={onAddTaskMore ? () => onAddTaskMore(column.id) : undefined}
                />
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
