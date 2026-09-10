import { Link } from 'react-router'
import { Badge } from '@taskflow/ui'

import { DueChip } from '@/components/board/DueChip'
import { PRIORITY_BADGE, PRIORITY_KEYS } from '@/components/board/priorityStyles'
import { useI18n } from '@/i18n'
import { taskBoardHref } from '@/lib/taskHref'
import type { AssignedTask } from '@/types/domain'

type MyTaskRowProps = {
  task: AssignedTask
}

export function MyTaskRow({ task }: MyTaskRowProps) {
  const { t } = useI18n()
  const boardLabel = task.boardName?.trim() || t('myTasks.untitledBoard')
  const workspaceLabel = task.workspaceName?.trim() || t('myTasks.untitledWorkspace')
  const priorityLabel = t(PRIORITY_KEYS[task.priority])

  return (
    <li>
      <Link
        to={taskBoardHref(String(task.board), task.id)}
        className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-muted/40"
      >
        <div className="min-w-0">
          <p className="truncate font-medium">{task.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t('myTasks.boardInWorkspace', { board: boardLabel, workspace: workspaceLabel })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
          {task.dueDate ? (
            <DueChip dueDate={task.dueDate} />
          ) : (
            <span className="text-[10px] text-muted-foreground">{t('myTasks.undated')}</span>
          )}
          <Badge variant="outline" className={`text-[10px] ${PRIORITY_BADGE[task.priority]}`}>
            {priorityLabel}
          </Badge>
        </div>
      </Link>
    </li>
  )
}
