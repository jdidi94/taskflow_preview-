import { useState } from 'react'
import { Alert } from '@taskflow/ui'

import { watcherIds } from '@/components/board/taskHelpers'
import {
  initials,
  type NormalizedWorkspaceMember,
} from '@/components/workspace/normalizeMembers'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import { useAddWatcherMutation, useRemoveWatcherMutation } from '@/services/tasksApi'
import type { Task } from '@/types/domain'

type TaskWatchersSectionProps = {
  task: Task
  boardId: string
  members: NormalizedWorkspaceMember[]
  disabled?: boolean
}

export function TaskWatchersSection({
  task,
  boardId,
  members,
  disabled,
}: TaskWatchersSectionProps) {
  const { t } = useI18n()
  const [error, setError] = useState<string | null>(null)
  const [addWatcher, { isLoading: adding }] = useAddWatcherMutation()
  const [removeWatcher, { isLoading: removing }] = useRemoveWatcherMutation()
  const selected = new Set(watcherIds(task))
  const busy = disabled || adding || removing

  async function toggle(userId: string) {
    setError(null)
    try {
      if (selected.has(userId)) {
        await removeWatcher({ taskId: task.id, boardId, userId }).unwrap()
      } else {
        await addWatcher({ taskId: task.id, boardId, userId }).unwrap()
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('board.watcherError')))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{t('board.watchers')}</span>
      <p className="text-xs text-muted-foreground">{t('board.watchersHint')}</p>
      {error ? <Alert variant="error" title={error} /> : null}
      {members.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('board.watchersEmpty')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map((member) => {
            const isWatching = selected.has(member.id)
            return (
              <button
                key={member.id}
                type="button"
                disabled={busy}
                onClick={() => void toggle(member.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                  isWatching
                    ? 'border-primary bg-primary/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
                aria-pressed={isWatching}
                aria-label={
                  isWatching
                    ? t('board.removeWatcher')
                    : t('board.watchers')
                }
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold">
                  {initials(member.name || member.email || member.id)}
                </span>
                {member.name || member.email}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
