import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/api'
import type { AppUser } from '@/types/users'

type UsersList = ApiSuccess<{ users: AppUser[]; total: number; page: number; limit: number }>

export const adminUsersApi = createApi({
  reducerPath: 'adminUsersApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Users'],
  endpoints: (builder) => ({
    listAppUsers: builder.query<
      UsersList,
      { page?: number; limit?: number; search?: string; role?: string; status?: string }
    >({
      query: (params) => ({ url: '/admin/app-users', params }),
      providesTags: ['Users'],
    }),
    createUser: builder.mutation<
      ApiSuccess<{ user: { id: string; email: string; systemRole: string } }>,
      { username: string; email: string; role?: string }
    >({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation<
      ApiSuccess<{ user: unknown }>,
      { userId: string; name?: string; email?: string; isActive?: boolean; systemRole?: string }
    >({
      query: ({ userId, ...body }) => ({ url: `/admin/users/${userId}`, method: 'PUT', body }),
      invalidatesTags: ['Users'],
    }),
    changeUserRole: builder.mutation<
      ApiSuccess<{ user: unknown; newRole: string }>,
      { userId: string; newRole: string }
    >({
      query: ({ userId, newRole }) => ({
        url: `/admin/users/${userId}/role`,
        method: 'PATCH',
        body: { newRole },
      }),
      invalidatesTags: ['Users'],
    }),
    banUser: builder.mutation<ApiSuccess<{ user: unknown }>, string>({
      query: (userId) => ({ url: `/admin/users/${userId}/ban`, method: 'POST' }),
      invalidatesTags: ['Users'],
    }),
    activateUser: builder.mutation<ApiSuccess<{ user: unknown }>, string>({
      query: (userId) => ({ url: `/admin/users/${userId}/activate`, method: 'POST' }),
      invalidatesTags: ['Users'],
    }),
    addAdminUser: builder.mutation<
      ApiSuccess<{ admin: unknown }>,
      { email: string; password: string; role: string }
    >({
      query: (body) => ({ url: '/admin/users/add-admin', method: 'POST', body }),
    }),
    getAvailableRoles: builder.query<
      ApiSuccess<{ availableRoles: string[]; userRole: string }>,
      void
    >({
      query: () => '/admin/users/available-roles',
    }),
  }),
})

export const {
  useListAppUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useChangeUserRoleMutation,
  useBanUserMutation,
  useActivateUserMutation,
  useAddAdminUserMutation,
  useGetAvailableRolesQuery,
} = adminUsersApi
