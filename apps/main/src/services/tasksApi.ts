import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type {
  ApiSuccess,
  AssignedTask,
  Task,
  TaskChecklistItem,
  TaskDependencyType,
  TaskPriority,
  TaskStatus,
} from '@/types/domain'

const ASSIGNED_TAGS = [
  { type: 'Tasks' as const, id: 'ASSIGNED_UPCOMING' },
  { type: 'Tasks' as const, id: 'ASSIGNED_ALL' },
]

function sortBoardTasks(tasks: Task[]) {
  return [...tasks].sort((a, b) => {
    if (a.column === b.column) return a.position - b.position
    return String(a.column).localeCompare(String(b.column))
  })
}

function applyTaskMove(tasks: Task[], id: string, columnId: string, position: number) {
  const task = tasks.find((item) => item.id === id)
  if (!task) return tasks
  const from = String(task.column)
  const to = String(columnId)
  const others = tasks.filter((item) => item.id !== id)
  const source = others.filter((item) => String(item.column) === from)
  const target = from === to ? source : others.filter((item) => String(item.column) === to)
  const clamped = Math.max(0, Math.min(position, target.length))
  target.splice(clamped, 0, task)
  task.column = to
  if (from === to) {
    target.forEach((item, index) => {
      item.position = index
    })
  } else {
    source.forEach((item, index) => {
      item.position = index
    })
    target.forEach((item, index) => {
      item.position = index
    })
  }
  return sortBoardTasks(tasks)
}

export type TaskWriteFields = {
  title?: string
  description?: string
  priority?: TaskPriority
  status?: TaskStatus
  color?: string
  assignees?: string[]
  tags?: string[]
  dueDate?: string | null
  checklist?: TaskChecklistItem[]
  attachments?: string[]
}

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Tasks'],
  endpoints: (builder) => ({
    listByBoard: builder.query<ApiSuccess<Task[]>, string>({
      query: (boardId) => `/tasks?boardId=${encodeURIComponent(boardId)}`,
      providesTags: (result, _error, boardId) =>
        result?.data
          ? [
              ...result.data.map((task) => ({ type: 'Tasks' as const, id: task.id })),
              { type: 'Tasks', id: `BOARD_${boardId}` },
            ]
          : [{ type: 'Tasks', id: `BOARD_${boardId}` }],
    }),
    listAssignedUpcoming: builder.query<
      ApiSuccess<AssignedTask[]>,
      { withinDays?: number; limit?: number } | void
    >({
      query: (args) => {
        const params = new URLSearchParams()
        const withinDays = args && typeof args === 'object' ? args.withinDays : undefined
        const limit = args && typeof args === 'object' ? args.limit : undefined
        if (withinDays) params.set('withinDays', String(withinDays))
        if (limit) params.set('limit', String(limit))
        const qs = params.toString()
        return `/tasks/assigned${qs ? `?${qs}` : ''}`
      },
      providesTags: [{ type: 'Tasks', id: 'ASSIGNED_UPCOMING' }],
    }),
    listMyTasks: builder.query<ApiSuccess<AssignedTask[]>, void>({
      query: () => '/tasks/assigned?scope=all&limit=200',
      providesTags: ASSIGNED_TAGS,
    }),
    getTask: builder.query<ApiSuccess<Task>, string>({
      query: (id) => `/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Tasks', id }],
    }),
    createTask: builder.mutation<
      ApiSuccess<Task>,
      {
        title: string
        boardId: string
        columnId: string
        description?: string
        priority?: TaskPriority
        color?: string
        assignees?: string[]
        tags?: string[]
        dueDate?: string | null
        checklist?: TaskChecklistItem[]
      }
    >({
      query: (body) => ({
        url: '/tasks',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
        ...ASSIGNED_TAGS,
      ],
    }),
    updateTask: builder.mutation<
      ApiSuccess<Task>,
      { id: string; boardId: string } & TaskWriteFields
    >({
      query: ({ id, boardId: _boardId, ...body }) => ({
        url: `/tasks/${id}`,
        method: 'PUT',
        body,
      }),
      async onQueryStarted({ id, boardId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          if (!data.data) return
          dispatch(
            tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
              const index = draft.data.findIndex((item) => item.id === id)
              if (index >= 0) draft.data[index] = { ...draft.data[index], ...data.data }
            }),
          )
        } catch {
          /* keep form error handling in the drawer */
        }
      },
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.id },
        ...ASSIGNED_TAGS,
      ],
    }),
    moveTask: builder.mutation<
      ApiSuccess<Task>,
      { id: string; boardId: string; columnId: string; position: number }
    >({
      query: ({ id, columnId, position }) => ({
        url: `/tasks/${id}/move`,
        method: 'PATCH',
        body: { columnId, position },
      }),
      async onQueryStarted({ id, boardId, columnId, position }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
            draft.data = applyTaskMove(draft.data, id, columnId, position)
          }),
        )
        try {
          const { data } = await queryFulfilled
          if (!data.data) return
          dispatch(
            tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
              const index = draft.data.findIndex((item) => item.id === id)
              if (index >= 0) draft.data[index] = { ...draft.data[index], ...data.data }
              draft.data = sortBoardTasks(draft.data)
            }),
          )
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: () => [...ASSIGNED_TAGS],
    }),
    deleteTask: builder.mutation<{ success: true }, { id: string; boardId: string }>({
      query: ({ id }) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id, boardId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
            draft.data = draft.data.filter((item) => item.id !== id)
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: () => [...ASSIGNED_TAGS],
    }),
    restoreTask: builder.mutation<
      ApiSuccess<Task>,
      { id: string; boardId: string; columnId?: string; position?: number; snapshot?: Task }
    >({
      query: ({ id, columnId, position }) => ({
        url: `/tasks/${id}/restore`,
        method: 'POST',
        body: { columnId, position },
      }),
      async onQueryStarted({ id, boardId, snapshot }, { dispatch, queryFulfilled }) {
        const patch = snapshot
          ? dispatch(
              tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
                if (draft.data.some((item) => item.id === id)) return
                draft.data.push({
                  ...snapshot,
                  archived: false,
                  status: snapshot.status === 'archived' ? 'todo' : snapshot.status,
                })
                draft.data = sortBoardTasks(draft.data)
              }),
            )
          : undefined
        try {
          const { data } = await queryFulfilled
          if (!data.data) return
          dispatch(
            tasksApi.util.updateQueryData('listByBoard', boardId, (draft) => {
              const index = draft.data.findIndex((item) => item.id === id)
              if (index >= 0) draft.data[index] = data.data
              else draft.data.push(data.data)
              draft.data = sortBoardTasks(draft.data)
            }),
          )
        } catch {
          patch?.undo()
        }
      },
      invalidatesTags: () => [...ASSIGNED_TAGS],
    }),
    addComment: builder.mutation<
      ApiSuccess<Task>,
      { taskId: string; boardId: string; body: string }
    >({
      query: ({ taskId, body }) => ({
        url: `/tasks/${taskId}/comments`,
        method: 'POST',
        body: { body },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
      ],
    }),
    updateComment: builder.mutation<
      ApiSuccess<Task>,
      { taskId: string; boardId: string; commentId: string; body: string }
    >({
      query: ({ taskId, commentId, body }) => ({
        url: `/tasks/${taskId}/comments/${commentId}`,
        method: 'PUT',
        body: { body },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
      ],
    }),
    deleteComment: builder.mutation<
      ApiSuccess<Task>,
      { taskId: string; boardId: string; commentId: string }
    >({
      query: ({ taskId, commentId }) => ({
        url: `/tasks/${taskId}/comments/${commentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
      ],
    }),
    addWatcher: builder.mutation<
      ApiSuccess<Task>,
      { taskId: string; boardId: string; userId: string }
    >({
      query: ({ taskId, userId }) => ({
        url: `/tasks/${taskId}/watchers`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
        ...ASSIGNED_TAGS,
      ],
    }),
    removeWatcher: builder.mutation<
      ApiSuccess<Task>,
      { taskId: string; boardId: string; userId: string }
    >({
      query: ({ taskId, userId }) => ({
        url: `/tasks/${taskId}/watchers/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
        ...ASSIGNED_TAGS,
      ],
    }),
    addDependency: builder.mutation<
      ApiSuccess<Task>,
      {
        taskId: string
        boardId: string
        dependsOnTaskId: string
        type: TaskDependencyType
      }
    >({
      query: ({ taskId, dependsOnTaskId, type }) => ({
        url: `/tasks/${taskId}/dependencies`,
        method: 'POST',
        body: { taskId: dependsOnTaskId, type },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
        ...ASSIGNED_TAGS,
      ],
    }),
    removeDependency: builder.mutation<
      ApiSuccess<Task>,
      { taskId: string; boardId: string; dependencyId: string }
    >({
      query: ({ taskId, dependencyId }) => ({
        url: `/tasks/${taskId}/dependencies/${dependencyId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.taskId },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
        ...ASSIGNED_TAGS,
      ],
    }),
  }),
})

export const {
  useListByBoardQuery,
  useListAssignedUpcomingQuery,
  useListMyTasksQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useDeleteTaskMutation,
  useRestoreTaskMutation,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useAddWatcherMutation,
  useRemoveWatcherMutation,
  useAddDependencyMutation,
  useRemoveDependencyMutation,
} = tasksApi
