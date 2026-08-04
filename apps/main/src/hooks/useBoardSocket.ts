import { useEffect } from 'react'

import { getBoardSocket, pushSocketLog } from '@/lib/socket'
import { boardsApi } from '@/services/boardsApi'
import { tasksApi } from '@/services/tasksApi'
import { useAppDispatch } from '@/store/hooks'
import type { Board, BoardColumn, Task } from '@/types/domain'

function asId(value: unknown) {
  if (value && typeof value === 'object' && '_id' in value) {
    return String((value as { _id: unknown })._id)
  }
  return String(value ?? '')
}

function normalizeTask(raw: Partial<Task> & { _id?: string }): Task | null {
  const id = raw.id ?? raw._id
  if (!id || !raw.title) return null
  return {
    id: String(id),
    title: raw.title,
    description: raw.description ?? null,
    board: asId(raw.board),
    space: raw.space ? asId(raw.space) : undefined,
    column: asId(raw.column),
    priority: raw.priority ?? 'medium',
    status: raw.status ?? 'todo',
    color: raw.color ?? null,
    assignees: raw.assignees ?? [],
    tags: raw.tags ?? [],
    dueDate: raw.dueDate ?? null,
    position: typeof raw.position === 'number' ? raw.position : 0,
    archived: raw.archived ?? false,
    attachments: (raw.attachments as string[] | undefined) ?? [],
    comments: raw.comments ?? [],
    checklist: raw.checklist ?? [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function normalizeColumn(raw: Partial<BoardColumn> & { _id?: string }): BoardColumn | null {
  const id = raw.id ?? raw._id
  if (!id || !raw.name) return null
  return {
    id: String(id),
    name: raw.name,
    board: asId(raw.board),
    position: typeof raw.position === 'number' ? raw.position : 0,
    taskIds: Array.isArray(raw.taskIds) ? raw.taskIds.map(String) : [],
    limit: raw.limit ?? null,
    isActive: raw.isActive ?? true,
  }
}

export function useBoardSocket(boardId: string | undefined) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!boardId) return

    let active = true
    const socket = getBoardSocket()

    const upsertTask = (taskRaw: Partial<Task>) => {
      const task = normalizeTask(taskRaw)
      if (!task || task.board !== boardId) return
      dispatch(
        tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
          const index = draft.data.findIndex((item) => item.id === task.id)
          if (index >= 0) draft.data[index] = task
          else draft.data.push(task)
          draft.data.sort((a, b) => {
            if (a.column === b.column) return a.position - b.position
            return String(a.column).localeCompare(String(b.column))
          })
        }),
      )
    }

    const removeTask = (taskId: string) => {
      dispatch(
        tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
          draft.data = draft.data.filter((item) => item.id !== taskId)
        }),
      )
    }

    const applyColumns = (columnsRaw: BoardColumn[]) => {
      const columns = columnsRaw
        .map((column) => normalizeColumn(column))
        .filter(Boolean) as BoardColumn[]
      if (!columns.length) return
      dispatch(
        boardsApi.util.updateQueryData('getBoard', boardId, (draft) => {
          draft.data.columns = columns.sort((a, b) => a.position - b.position)
        }),
      )
    }

    const joinBoard = () => {
      socket.emit('board:join', { boardId })
      pushSocketLog('/board', 'emit', `board:join ${boardId}`)
    }

    const onState = (payload: {
      board?: Board & { columns?: BoardColumn[] }
      columns?: BoardColumn[]
      tasks?: Task[]
    }) => {
      if (!active) return
      pushSocketLog('/board', 'event', 'board:state', {
        columns: payload.columns?.length ?? payload.board?.columns?.length,
        tasks: payload.tasks?.length,
      })
      const columns = (payload.columns ?? payload.board?.columns ?? [])
        .map((column) => normalizeColumn(column))
        .filter(Boolean) as BoardColumn[]

      if (payload.board) {
        dispatch(
          boardsApi.util.updateQueryData('getBoard', boardId, (draft) => {
            draft.data = {
              ...draft.data,
              ...payload.board,
              id: boardId,
              columns,
            }
          }),
        )
      }

      if (Array.isArray(payload.tasks)) {
        const tasks = payload.tasks
          .map((task) => normalizeTask(task))
          .filter(Boolean) as Task[]
        dispatch(
          tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
            draft.data = tasks
          }),
        )
      }
    }

    const onTaskCreated = (payload: { task?: Task }) => {
      pushSocketLog('/board', 'event', 'task:created', { id: payload.task?.id })
      if (payload.task) upsertTask(payload.task)
    }
    const onTaskUpdated = (payload: { task?: Task }) => {
      pushSocketLog('/board', 'event', 'task:updated', { id: payload.task?.id })
      if (payload.task) upsertTask(payload.task)
    }
    const onTaskMoved = (payload: { task?: Task }) => {
      pushSocketLog('/board', 'event', 'task:moved', { id: payload.task?.id })
      if (payload.task) upsertTask(payload.task)
    }
    const onTaskDeleted = (payload: { taskId?: string; task?: Task }) => {
      const id = payload.taskId ?? payload.task?.id
      pushSocketLog('/board', 'event', 'task:deleted', { id })
      if (id) removeTask(String(id))
    }

    const onColumnCreated = (payload: { column?: BoardColumn }) => {
      pushSocketLog('/board', 'event', 'column:created', { id: payload.column?.id })
      const column = payload.column ? normalizeColumn(payload.column) : null
      if (!column) return
      dispatch(
        boardsApi.util.updateQueryData('getBoard', boardId, (draft) => {
          const columns = draft.data.columns ?? []
          if (columns.some((item) => item.id === column.id)) return
          draft.data.columns = [...columns, column].sort((a, b) => a.position - b.position)
        }),
      )
    }

    const onColumnUpdated = (payload: { column?: BoardColumn }) => {
      pushSocketLog('/board', 'event', 'column:updated', { id: payload.column?.id })
      const column = payload.column ? normalizeColumn(payload.column) : null
      if (!column) return
      dispatch(
        boardsApi.util.updateQueryData('getBoard', boardId, (draft) => {
          draft.data.columns = (draft.data.columns ?? []).map((item) =>
            item.id === column.id ? column : item,
          )
        }),
      )
    }

    const onColumnDeleted = (payload: { columnId?: string }) => {
      pushSocketLog('/board', 'event', 'column:deleted', { id: payload.columnId })
      if (!payload.columnId) return
      dispatch(
        boardsApi.util.updateQueryData('getBoard', boardId, (draft) => {
          draft.data.columns = (draft.data.columns ?? []).filter(
            (item) => item.id !== payload.columnId,
          )
        }),
      )
    }

    const onColumnsReordered = (payload: { columns?: BoardColumn[] }) => {
      pushSocketLog('/board', 'event', 'columns:reordered', {
        count: payload.columns?.length,
      })
      if (payload.columns) applyColumns(payload.columns)
    }

    joinBoard()
    socket.on('connect', joinBoard)
    socket.on('board:state', onState)
    socket.on('task:created', onTaskCreated)
    socket.on('task:updated', onTaskUpdated)
    socket.on('task:moved', onTaskMoved)
    socket.on('task:deleted', onTaskDeleted)
    socket.on('column:created', onColumnCreated)
    socket.on('column:updated', onColumnUpdated)
    socket.on('column:deleted', onColumnDeleted)
    socket.on('columns:reordered', onColumnsReordered)

    return () => {
      active = false
      socket.emit('board:leave', { boardId })
      pushSocketLog('/board', 'emit', `board:leave ${boardId}`)
      socket.off('connect', joinBoard)
      socket.off('board:state', onState)
      socket.off('task:created', onTaskCreated)
      socket.off('task:updated', onTaskUpdated)
      socket.off('task:moved', onTaskMoved)
      socket.off('task:deleted', onTaskDeleted)
      socket.off('column:created', onColumnCreated)
      socket.off('column:updated', onColumnUpdated)
      socket.off('column:deleted', onColumnDeleted)
      socket.off('columns:reordered', onColumnsReordered)
    }
  }, [boardId, dispatch])
}
