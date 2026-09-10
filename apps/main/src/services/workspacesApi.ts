import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess, Workspace, WorkspaceMembersPayload } from '@/types/domain'

export type WorkspaceRules = {
  content: string
  updatedAt?: string | null
  updatedBy?: string | null
}

export const workspacesApi = createApi({
  reducerPath: 'workspacesApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Workspaces', 'Workspace', 'WorkspaceMembers', 'WorkspaceRules'],
  endpoints: (builder) => ({
    listWorkspaces: builder.query<ApiSuccess<Workspace[]>, void>({
      query: () => '/workspaces',
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map((workspace) => ({ type: 'Workspace' as const, id: workspace.id })),
              { type: 'Workspaces', id: 'LIST' },
            ]
          : [{ type: 'Workspaces', id: 'LIST' }],
    }),
    getWorkspace: builder.query<ApiSuccess<Workspace>, string>({
      query: (id) => `/workspaces/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Workspace', id }],
    }),
    listWorkspaceMembers: builder.query<ApiSuccess<WorkspaceMembersPayload>, string>({
      query: (id) => `/workspaces/${id}/members`,
      providesTags: (_result, _error, id) => [{ type: 'WorkspaceMembers', id }],
    }),
    getWorkspaceRules: builder.query<ApiSuccess<WorkspaceRules>, string>({
      query: (id) => `/workspaces/${id}/rules`,
      providesTags: (_result, _error, id) => [{ type: 'WorkspaceRules', id }],
    }),
    updateWorkspaceRules: builder.mutation<
      ApiSuccess<WorkspaceRules>,
      { workspaceId: string; content: string }
    >({
      query: ({ workspaceId, content }) => ({
        url: `/workspaces/${workspaceId}/rules`,
        method: 'PUT',
        body: { content },
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'WorkspaceRules', id: arg.workspaceId }],
    }),
    createWorkspace: builder.mutation<
      ApiSuccess<Workspace>,
      { name: string; description?: string }
    >({
      query: (body) => ({
        url: '/workspaces',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Workspaces', id: 'LIST' }],
    }),
    updateWorkspace: builder.mutation<
      ApiSuccess<Workspace>,
      {
        id: string
        name?: string
        description?: string
        githubOrg?: Workspace['githubOrg'] | null
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/workspaces/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Workspaces', id: 'LIST' },
        { type: 'Workspace', id: arg.id },
      ],
    }),
    archiveWorkspace: builder.mutation<ApiSuccess<Workspace>, string>({
      query: (id) => ({
        url: `/workspaces/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Workspaces', id: 'LIST' },
        { type: 'Workspace', id },
      ],
    }),
    restoreWorkspace: builder.mutation<ApiSuccess<Workspace>, string>({
      query: (id) => ({
        url: `/workspaces/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Workspaces', id: 'LIST' },
        { type: 'Workspace', id },
      ],
    }),
    permanentDeleteWorkspace: builder.mutation<{ success: true }, string>({
      query: (id) => ({
        url: `/workspaces/${id}/permanent`,
        method: 'DELETE',
      }),
      invalidatesTags: () => [{ type: 'Workspaces', id: 'LIST' }],
    }),
    createInviteLink: builder.mutation<
      ApiSuccess<{ token: string; inviteUrl: string; expiresAt?: string }>,
      string
    >({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/invite-link`,
        method: 'GET',
      }),
    }),
    updateMemberRole: builder.mutation<
      ApiSuccess<Workspace>,
      { workspaceId: string; memberId: string; role: 'member' | 'admin' }
    >({
      query: ({ workspaceId, memberId, role }) => ({
        url: `/workspaces/${workspaceId}/members/${memberId}/role`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'WorkspaceMembers', id: arg.workspaceId },
        { type: 'Workspace', id: arg.workspaceId },
      ],
    }),
    removeMember: builder.mutation<
      ApiSuccess<Workspace>,
      { workspaceId: string; memberId: string }
    >({
      query: ({ workspaceId, memberId }) => ({
        url: `/workspaces/${workspaceId}/members/${memberId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'WorkspaceMembers', id: arg.workspaceId },
        { type: 'Workspace', id: arg.workspaceId },
      ],
    }),
  }),
})

export const {
  useListWorkspacesQuery,
  useGetWorkspaceQuery,
  useListWorkspaceMembersQuery,
  useGetWorkspaceRulesQuery,
  useUpdateWorkspaceRulesMutation,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useArchiveWorkspaceMutation,
  useRestoreWorkspaceMutation,
  usePermanentDeleteWorkspaceMutation,
  useCreateInviteLinkMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} = workspacesApi
