import { useCallback } from 'react'

import { useToast } from '@/components/common/ToastProvider'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/lib/apiError'
import {
  useDeleteTaskMutation,
  useMoveTaskMutation,
  useRestoreTaskMutation,
} from '@/services/tasksApi'
import type { Task } from '@/types/domain'

export function useBoardInstantFeedback(boardId: string) {
  const { t } = useI18n()
  const toast = useToast()
  const [moveTask] = useMoveTaskMutation()
  const [deleteTask] = useDeleteTaskMutation()
  const [restoreTask] = useRestoreTaskMutation()

  const moveWithUndo = useCallback(
    async (task: Task, targetColumnId: string, position: number) => {
      const prevColumn = String(task.column)
      const prevPosition = task.position
      if (prevColumn === targetColumnId && prevPosition === position) return
      try {
        await moveTask({
          id: task.id,
          boardId,
          columnId: targetColumnId,
          position,
        }).unwrap()
        toast.show({
          message: t('board.toastMoved'),
          actionLabel: t('common.undo'),
          onAction: () => {
            void moveTask({
              id: task.id,
              boardId,
              columnId: prevColumn,
              position: prevPosition,
            })
          },
        })
      } catch (err) {
        toast.error(getApiErrorMessage(err, t('board.moveError')))
      }
    },
    [boardId, moveTask, t, toast],
  )

  const archiveWithUndo = useCallback(
    async (task: Task) => {
      try {
        await deleteTask({ id: task.id, boardId }).unwrap()
        toast.show({
          message: t('board.toastArchived'),
          actionLabel: t('common.undo'),
          onAction: () => {
            void restoreTask({
              id: task.id,
              boardId,
              columnId: String(task.column),
              position: task.position,
              snapshot: task,
            }).unwrap().catch((err) => {
              toast.error(getApiErrorMessage(err, t('board.restoreTaskError')))
            })
          },
        })
      } catch (err) {
        toast.error(getApiErrorMessage(err, t('board.archiveTaskError')))
        throw err
      }
    },
    [boardId, deleteTask, restoreTask, t, toast],
  )

  return { moveWithUndo, archiveWithUndo }
}
