import { Link } from 'react-router'
import { Badge, Card, CardContent, CardHeader, CardTitle, Loading } from '@taskflow/ui'
import { CalendarClock } from 'lucide-react'

import { useI18n } from '@/i18n'
import { useListAssignedUpcomingQuery } from '@/services/tasksApi'
import type { Task } from '@/types/domain'

function isOverdue(task: Task) {
  if (!task.dueDate) return false
  return new Date(task.dueDate).getTime() < Date.now()
}

function formatDue(value: string, t: ReturnType<typeof useI18n>['t']) {
  try {
    const due = new Date(value)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfDue = new Date(due)
    startOfDue.setHours(0, 0, 0, 0)
    const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return t('dashboard.dueOverdue')
    if (diffDays === 0) return t('dashboard.dueToday')
    if (diffDays === 1) return t('dashboard.dueTomorrow')
    return t('dashboard.dueInDays', { n: diffDays })
  } catch {
    return value
  }
}

export function UpcomingDeadlinesWidget() {
  const { t } = useI18n()
  const { data, isLoading, isError } = useListAssignedUpcomingQuery({ withinDays: 14, limit: 8 })
  const tasks = data?.data ?? []

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-base">{t('dashboard.deadlinesTitle')}</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">{t('dashboard.deadlinesSubtitle')}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loading label={t('common.loading')} /> : null}
        {isError ? <p className="text-sm text-destructive">{t('dashboard.deadlinesError')}</p> : null}
        {!isLoading && !isError && tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.deadlinesEmpty')}</p>
        ) : null}
        {!isLoading && !isError && tasks.length > 0 ? (
          <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
            {tasks.map((task) => {
              const overdue = isOverdue(task)
              return (
                <li key={task.id}>
                  <Link
                    to={`/boards/${task.board}`}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {task.dueDate ? formatDue(task.dueDate, t) : '—'}
                      </p>
                    </div>
                    <Badge variant={overdue ? 'error' : 'outline'} className="shrink-0 text-[10px]">
                      {overdue ? t('dashboard.dueOverdue') : task.priority}
                    </Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  )
}
