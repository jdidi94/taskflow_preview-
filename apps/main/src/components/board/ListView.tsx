import { Badge } from '@taskflow/ui'

import { BoardDenseTaskRow } from '@/components/board/BoardDenseTaskRow'
import { useI18n } from '@/i18n'
import type { BoardColumn, Task } from '@/types/domain'

type ListViewProps = {
  columns: BoardColumn[]
  tasksByColumn: Map<string, Task[]>
  onEditTask: (task: Task) => void
}

export function ListView({ columns, tasksByColumn, onEditTask }: ListViewProps) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      {columns.map((column) => {
        const tasks = tasksByColumn.get(column.id) ?? []
        const hasLimit = column.limit != null && column.limit > 0
        const overWip = hasLimit && tasks.length > column.limit!

        return (
          <section key={column.id} className="rounded-xl border border-border/70 bg-card/30">
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
              <p className="px-3 py-3 text-xs text-muted-foreground">{t('board.listEmpty')}</p>
            ) : (
              <ul className="divide-y divide-border/50">
                {tasks.map((task) => (
                  <BoardDenseTaskRow key={task.id} task={task} onEdit={onEditTask} />
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
