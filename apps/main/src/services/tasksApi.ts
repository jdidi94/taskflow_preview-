import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'
import type {
  ApiSuccess,
  Task,
  TaskChecklistItem,
  TaskPriority,
  TaskStatus,
} from '@/types/domain'

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
      ApiSuccess<Task[]>,
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
      invalidatesTags: (_result, _error, arg) => [{ type: 'Tasks', id: `BOARD_${arg.boardId}` }],
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
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Tasks', id: arg.id },
        { type: 'Tasks', id: `BOARD_${arg.boardId}` },
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
            const task = draft.data.find((item) => item.id === id)
            if (!task) return
            task.column = columnId
            task.position = position
            draft.data = [...draft.data].sort((a, b) => {
              if (a.column === b.column) return a.position - b.position
              return String(a.column).localeCompare(String(b.column))
            })
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'Tasks', id: `BOARD_${arg.boardId}` }],
    }),
    deleteTask: builder.mutation<{ success: true }, { id: string; boardId: string }>({
      query: ({ id }) => ({
        url: `/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Tasks', id: `BOARD_${arg.boardId}` }],
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
  }),
})

export const {
  useListByBoardQuery,
  useListAssignedUpcomingQuery,
  useGetTaskQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useMoveTaskMutation,
  useDeleteTaskMutation,
  useAddCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = tasksApi
