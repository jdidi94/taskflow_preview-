import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'

export type Invitation = {
  id: string
  email?: string
  type?: string
  role?: string
  status?: string
  token?: string
  message?: string
  targetEntityId?: string
}

type ApiSuccess<T> = { success: true; data: T }

function normalizeInvitation(raw: Record<string, unknown>): Invitation {
  return {
    id: String(raw.id ?? raw._id ?? ''),
    email: raw.email ? String(raw.email) : undefined,
    type: raw.type ? String(raw.type) : undefined,
    role: raw.role ? String(raw.role) : undefined,
    status: raw.status ? String(raw.status) : undefined,
    token: raw.token ? String(raw.token) : undefined,
    message: raw.message ? String(raw.message) : undefined,
    targetEntityId: raw.targetEntityId
      ? String(raw.targetEntityId)
      : raw.targetEntity
        ? String((raw.targetEntity as { _id?: string })._id ?? raw.targetEntity)
        : undefined,
  }
}

function asList(data: unknown): Invitation[] {
  if (Array.isArray(data)) return data.map((item) => normalizeInvitation(item as Record<string, unknown>))
  if (data && typeof data === 'object' && Array.isArray((data as { invitations?: unknown }).invitations)) {
    return ((data as { invitations: unknown[] }).invitations).map((item) =>
      normalizeInvitation(item as Record<string, unknown>),
    )
  }
  return []
}

export const invitationsApi = createApi({
  reducerPath: 'invitationsApi',
  baseQuery,
  tagTypes: ['Invitations'],
  endpoints: (builder) => ({
    listPending: builder.query<ApiSuccess<Invitation[]>, void>({
      query: () => '/invitations/user/pending',
      transformResponse: (response: ApiSuccess<unknown>) => ({
        success: true,
        data: asList(response.data),
      }),
      providesTags: [{ type: 'Invitations', id: 'PENDING' }],
    }),
    getByToken: builder.query<ApiSuccess<Invitation>, string>({
      query: (token) => `/invitations/token/${encodeURIComponent(token)}`,
      transformResponse: (response: ApiSuccess<Record<string, unknown>>) => ({
        success: true,
        data: normalizeInvitation(response.data),
      }),
    }),
    createInvitation: builder.mutation<
      ApiSuccess<Invitation>,
      { type: 'workspace' | 'space' | 'board'; email: string; targetEntityId: string; role?: string; message?: string }
    >({
      query: (body) => ({
        url: '/invitations',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiSuccess<Record<string, unknown>>) => ({
        success: true,
        data: normalizeInvitation(response.data),
      }),
      invalidatesTags: [{ type: 'Invitations', id: 'PENDING' }],
    }),
    acceptByToken: builder.mutation<ApiSuccess<unknown>, { token: string }>({
      query: ({ token }) => ({
        url: `/invitations/token/${encodeURIComponent(token)}/accept`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Invitations', id: 'PENDING' }],
    }),
    declineByToken: builder.mutation<ApiSuccess<unknown>, { token: string }>({
      query: ({ token }) => ({
        url: `/invitations/token/${encodeURIComponent(token)}/decline`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Invitations', id: 'PENDING' }],
    }),
    acceptById: builder.mutation<ApiSuccess<unknown>, { invitationId: string }>({
      query: ({ invitationId }) => ({
        url: `/invitations/${invitationId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Invitations', id: 'PENDING' }],
    }),
    declineById: builder.mutation<ApiSuccess<unknown>, { invitationId: string }>({
      query: ({ invitationId }) => ({
        url: `/invitations/${invitationId}/decline`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Invitations', id: 'PENDING' }],
    }),
  }),
})

export const {
  useListPendingQuery,
  useGetByTokenQuery,
  useCreateInvitationMutation,
  useAcceptByTokenMutation,
  useDeclineByTokenMutation,
  useAcceptByIdMutation,
  useDeclineByIdMutation,
} = invitationsApi
