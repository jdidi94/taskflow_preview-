import { Alert, Loading } from '@taskflow/ui'
import { ListTodo } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { PageBreadcrumbs } from '@/components/common/PageBreadcrumbs'
import { groupMyTasks } from '@/components/my-tasks/groupMyTasks'
import { MyTaskRow } from '@/components/my-tasks/MyTaskRow'
import { MyTasksSection } from '@/components/my-tasks/MyTasksSection'
import { useI18n } from '@/i18n'
import { useListMyTasksQuery } from '@/services/tasksApi'

export function MyTasksPanel() {
  const { t } = useI18n()
  const { data, isLoading, isError } = useListMyTasksQuery()
  const tasks = data?.data ?? []
  const grouped = groupMyTasks(tasks)

  return (
    <div className="flex flex-col gap-8">
      <section>
        <PageBreadcrumbs
          items={[
            { label: t('common.dashboard'), to: '/dashboard' },
            { label: t('myTasks.title') },
          ]}
        />
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t('myTasks.title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('myTasks.subtitle')}</p>
      </section>

      {isLoading ? <Loading label={t('common.loading')} /> : null}
      {isError ? <Alert variant="error" title={t('myTasks.loadError')} /> : null}

      {!isLoading && !isError && tasks.length === 0 ? (
        <EmptyState icon={ListTodo} title={t('myTasks.emptyTitle')} description={t('myTasks.empty')} />
      ) : null}

      {!isLoading && !isError && tasks.length > 0 ? (
        <div className="flex flex-col gap-6">
          <MyTasksSection title={t('myTasks.overdue')} count={grouped.overdue.length}>
            <ul className="divide-y divide-border/50">
              {grouped.overdue.map((task) => (
                <MyTaskRow key={task.id} task={task} />
              ))}
            </ul>
          </MyTasksSection>

          <MyTasksSection title={t('myTasks.dueSoon')} count={grouped.dueSoon.length}>
            <ul className="divide-y divide-border/50">
              {grouped.dueSoon.map((task) => (
                <MyTaskRow key={task.id} task={task} />
              ))}
            </ul>
          </MyTasksSection>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-tight">{t('myTasks.byWorkspace')}</h2>
            {grouped.byWorkspace.map((group) => (
              <MyTasksSection
                key={group.workspaceId}
                title={group.workspaceName?.trim() || t('myTasks.untitledWorkspace')}
                count={group.tasks.length}
              >
                <ul className="divide-y divide-border/50">
                  {group.tasks.map((task) => (
                    <MyTaskRow key={task.id} task={task} />
                  ))}
                </ul>
              </MyTasksSection>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
