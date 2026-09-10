import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess, Space, WorkspaceMemberUser } from '@/types/domain'

export type SpaceMemberRole = 'viewer' | 'member' | 'admin'

export type SpaceMemberEntry = {
  user: string | WorkspaceMemberUser
  role: SpaceMemberRole | string
  joinedAt?: string
}

export const spacesApi = createApi({
  reducerPath: 'spacesApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Spaces', 'Space', 'SpaceMembers'],
  endpoints: (builder) => ({
    listByWorkspace: builder.query<ApiSuccess<Space[]>, string>({
      query: (workspaceId) => `/spaces/workspace/${workspaceId}`,
      providesTags: (result, _error, workspaceId) =>
        result?.data
          ? [
              ...result.data.map((space) => ({ type: 'Space' as const, id: space.id })),
              { type: 'Spaces', id: workspaceId },
            ]
          : [{ type: 'Spaces', id: workspaceId }],
    }),
    getSpace: builder.query<ApiSuccess<Space>, string>({
      query: (id) => `/spaces/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Space', id }],
    }),
    listSpaceMembers: builder.query<ApiSuccess<SpaceMemberEntry[]>, string>({
      query: (id) => `/spaces/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'SpaceMembers', id }],
    }),
    createSpace: builder.mutation<
      ApiSuccess<Space>,
      { name: string; description?: string; workspaceId: string }
    >({
      query: (body) => ({
        url: '/spaces',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Spaces', id: arg.workspaceId }],
    }),
    updateSpace: builder.mutation<
      ApiSuccess<Space>,
      { id: string; workspaceId: string; name?: string; description?: string }
    >({
      query: ({ id, workspaceId: _workspaceId, ...body }) => ({
        url: `/spaces/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Spaces', id: arg.workspaceId },
        { type: 'Space', id: arg.id },
      ],
    }),
    addSpaceMember: builder.mutation<
      ApiSuccess<Space>,
      { spaceId: string; userId: string; role: SpaceMemberRole }
    >({
      query: ({ spaceId, userId, role }) => ({
        url: `/spaces/${spaceId}/members`,
        method: 'POST',
        body: { userId, role },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'SpaceMembers', id: arg.spaceId },
        { type: 'Space', id: arg.spaceId },
      ],
    }),
    removeSpaceMember: builder.mutation<
      ApiSuccess<Space>,
      { spaceId: string; memberId: string }
    >({
      query: ({ spaceId, memberId }) => ({
        url: `/spaces/${spaceId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'SpaceMembers', id: arg.spaceId },
        { type: 'Space', id: arg.spaceId },
      ],
    }),
    archiveSpace: builder.mutation<ApiSuccess<Space>, { id: string; workspaceId: string }>({
      query: ({ id }) => ({
        url: `/spaces/${id}/archive`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Spaces', id: arg.workspaceId },
        { type: 'Space', id: arg.id },
      ],
    }),
    restoreSpace: builder.mutation<ApiSuccess<Space>, { id: string; workspaceId: string }>({
      query: ({ id }) => ({
        url: `/spaces/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Spaces', id: arg.workspaceId },
        { type: 'Space', id: arg.id },
      ],
    }),
    permanentDeleteSpace: builder.mutation<
      { success: true },
      { id: string; workspaceId: string }
    >({
      query: ({ id }) => ({
        url: `/spaces/${id}/permanent`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Spaces', id: arg.workspaceId },
        { type: 'Space', id: arg.id },
      ],
    }),
  }),
})

export const {
  useListByWorkspaceQuery,
  useLazyListByWorkspaceQuery,
  useGetSpaceQuery,
  useListSpaceMembersQuery,
  useCreateSpaceMutation,
  useUpdateSpaceMutation,
  useAddSpaceMemberMutation,
  useRemoveSpaceMemberMutation,
  useArchiveSpaceMutation,
  useRestoreSpaceMutation,
  usePermanentDeleteSpaceMutation,
} = spacesApi
