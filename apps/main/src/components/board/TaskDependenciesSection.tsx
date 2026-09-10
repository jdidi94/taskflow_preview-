import { useMemo, useState } from 'react'
import { Alert, Button, Input } from '@taskflow/ui'

import { normalizeDependencies } from '@/components/board/taskHelpers'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAddDependencyMutation, useRemoveDependencyMutation } from '@/services/tasksApi'
import type { Task, TaskDependencyType } from '@/types/domain'

type TaskDependenciesSectionProps = {
  task: Task
  boardId: string
  boardTasks: Task[]
  disabled?: boolean
  onOpenTask?: (task: Task) => void
}

const DEP_TYPES: TaskDependencyType[] = ['blocks', 'blocked_by', 'related']

export function TaskDependenciesSection({
  task,
  boardId,
  boardTasks,
  disabled,
  onOpenTask,
}: TaskDependenciesSectionProps) {
  const { t } = useI18n()
  const [type, setType] = useState<TaskDependencyType>('related')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [addDependency, { isLoading: adding }] = useAddDependencyMutation()
  const [removeDependency, { isLoading: removing }] = useRemoveDependencyMutation()

  const dependencies = normalizeDependencies(task.dependencies)
  const busy = disabled || adding || removing
  const tasksById = useMemo(() => new Map(boardTasks.map((item) => [item.id, item])), [boardTasks])

  const existingKeys = useMemo(
    () => new Set(dependencies.map((dep) => `${dep.taskId}:${dep.type}`)),
    [dependencies],
  )

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return boardTasks
      .filter((item) => item.id !== task.id && !item.archived)
      .filter((item) => !existingKeys.has(`${item.id}:${type}`))
      .filter((item) => item.title.toLowerCase().includes(q))
      .slice(0, 8)
  }, [boardTasks, existingKeys, query, task.id, type])

  async function handleAdd(target: Task) {
    setError(null)
    try {
      await addDependency({
        taskId: task.id,
        boardId,
        dependsOnTaskId: target.id,
        type,
      }).unwrap()
      setQuery('')
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.dependencyError')))
    }
  }

  async function handleRemove(dependencyId: string) {
    setError(null)
    try {
      await removeDependency({ taskId: task.id, boardId, dependencyId }).unwrap()
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.dependencyError')))
    }
  }

  function typeLabel(value: TaskDependencyType) {
    if (value === 'blocks') return t('board.depBlocks')
    if (value === 'blocked_by') return t('board.depBlockedBy')
    return t('board.depRelated')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground">{t('board.dependencies')}</span>
      {error ? <Alert variant="error" title={error} /> : null}

      {dependencies.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('board.dependenciesEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70">
          {dependencies.map((dep) => {
            const linked = tasksById.get(dep.taskId)
            return (
              <li key={dep.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {linked?.title || t('board.openDependency')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{typeLabel(dep.type)}</p>
                </div>
                {linked && onOpenTask ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => onOpenTask(linked)}
                  >
                    {t('board.openDependency')}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={busy}
                  onClick={() => void handleRemove(dep.id)}
                >
                  {t('board.removeDependency')}
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sm:w-44">
          <span className="sr-only">{t('board.dependencyType')}</span>
          <select
            className="tf-input"
            value={type}
            disabled={busy}
            onChange={(event) => setType(event.target.value as TaskDependencyType)}
          >
            {DEP_TYPES.map((value) => (
              <option key={value} value={value}>
                {typeLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <Input
          className="flex-1"
          value={query}
          disabled={busy}
          placeholder={t('board.dependencySearch')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {query.trim() ? (
        matches.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('board.dependencyNoMatch')}</p>
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border/70">
            {matches.map((item) => (
              <li key={item.id} className="border-b border-border/50 last:border-b-0">
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-muted/40"
                  onClick={() => void handleAdd(item)}
                >
                  <span className="truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t('board.addDependency')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  )
}
