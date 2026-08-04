import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'
import type { ApiSuccess, Board, BoardColumn } from '@/types/domain'

export const boardsApi = createApi({
  reducerPath: 'boardsApi',
  baseQuery,
  tagTypes: ['Boards', 'Board'],
  endpoints: (builder) => ({
    listBySpace: builder.query<ApiSuccess<Board[]>, string>({
      query: (spaceId) => `/boards/space/${spaceId}`,
      providesTags: (result, _error, spaceId) =>
        result?.data
          ? [
              ...result.data.map((board) => ({ type: 'Board' as const, id: board.id })),
              { type: 'Boards', id: spaceId },
            ]
          : [{ type: 'Boards', id: spaceId }],
    }),
    getBoard: builder.query<ApiSuccess<Board>, string>({
      query: (id) => `/boards/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Board', id }],
    }),
    createBoard: builder.mutation<
      ApiSuccess<Board>,
      { name: string; description?: string; spaceId: string }
    >({
      query: (body) => ({
        url: '/boards',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Boards', id: arg.spaceId }],
    }),
    updateBoard: builder.mutation<
      ApiSuccess<Board>,
      {
        id: string
        spaceId: string
        name?: string
        description?: string
        type?: Board['type']
        visibility?: Board['visibility']
      }
    >({
      query: ({ id, spaceId: _spaceId, ...body }) => ({
        url: `/boards/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Boards', id: arg.spaceId },
        { type: 'Board', id: arg.id },
      ],
    }),
    archiveBoard: builder.mutation<ApiSuccess<Board>, { id: string; spaceId: string }>({
      query: ({ id }) => ({
        url: `/boards/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Boards', id: arg.spaceId },
        { type: 'Board', id: arg.id },
      ],
    }),
    restoreBoard: builder.mutation<ApiSuccess<Board>, { id: string; spaceId: string }>({
      query: ({ id }) => ({
        url: `/boards/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Boards', id: arg.spaceId },
        { type: 'Board', id: arg.id },
      ],
    }),
    reorderColumns: builder.mutation<
      ApiSuccess<BoardColumn[]>,
      { boardId: string; columnIds: string[] }
    >({
      query: ({ boardId, columnIds }) => ({
        url: `/boards/${boardId}/columns/reorder`,
        method: 'PATCH',
        body: { columnIds },
      }),
      async onQueryStarted({ boardId, columnIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          boardsApi.util.updateQueryData('getBoard', boardId, (draft) => {
            if (!draft.data.columns) return
            const byId = new Map(draft.data.columns.map((c) => [c.id, c]))
            draft.data.columns = columnIds
              .map((id, position) => {
                const col = byId.get(id)
                if (!col) return null
                return { ...col, position }
              })
              .filter((c): c is BoardColumn => Boolean(c))
          }),
        )
        try {
          await queryFulfilled
        } catch {
          patch.undo()
        }
      },
      invalidatesTags: (_result, _error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
    createColumn: builder.mutation<
      ApiSuccess<BoardColumn>,
      { boardId: string; name: string; limit?: number | null }
    >({
      query: ({ boardId, ...body }) => ({
        url: `/boards/${boardId}/columns`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
    updateColumn: builder.mutation<
      ApiSuccess<BoardColumn>,
      { boardId: string; columnId: string; name?: string; limit?: number | null }
    >({
      query: ({ boardId, columnId, ...body }) => ({
        url: `/boards/${boardId}/columns/${columnId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
    deleteColumn: builder.mutation<
      { success: true },
      { boardId: string; columnId: string }
    >({
      query: ({ boardId, columnId }) => ({
        url: `/boards/${boardId}/columns/${columnId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Board', id: arg.boardId }],
    }),
  }),
})

export const {
  useListBySpaceQuery,
  useLazyListBySpaceQuery,
  useGetBoardQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useArchiveBoardMutation,
  useRestoreBoardMutation,
  useReorderColumnsMutation,
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useDeleteColumnMutation,
} = boardsApi
