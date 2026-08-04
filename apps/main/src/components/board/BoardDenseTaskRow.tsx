import { Badge, Button } from '@taskflow/ui'
import { Pencil } from 'lucide-react'

import { DueChip } from '@/components/board/DueChip'
import { PriorityRail } from '@/components/board/PriorityRail'
import { PRIORITY_BADGE, PRIORITY_KEYS } from '@/components/board/priorityStyles'
import { useI18n } from '@/i18n'
import type { Task } from '@/types/domain'

type BoardDenseTaskRowProps = {
  task: Task
  onEdit: (task: Task) => void
  /** Optional leading meta (e.g. due date string for undated sections). */
  leading?: string
}

export function BoardDenseTaskRow({ task, onEdit, leading }: BoardDenseTaskRowProps) {
  const { t } = useI18n()
  const priorityLabel = t(PRIORITY_KEYS[task.priority])

  return (
    <li className="group relative flex items-center gap-2 py-1.5 pe-2 ps-3.5 hover:bg-muted/40">
      <PriorityRail priority={task.priority} className="w-1" />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          {leading ? (
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{leading}</span>
          ) : null}
          <p className="truncate text-sm font-medium leading-snug" title={task.title}>
            {task.title}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {task.dueDate && !leading ? <DueChip dueDate={task.dueDate} /> : null}
        <Badge
          variant="outline"
          className={`hidden text-[10px] sm:inline-flex ${PRIORITY_BADGE[task.priority]}`}
          aria-label={priorityLabel}
        >
          {priorityLabel}
        </Badge>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground opacity-70 group-hover:opacity-100"
          onClick={() => onEdit(task)}
          aria-label={t('board.edit')}
          title={t('board.edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  )
}
