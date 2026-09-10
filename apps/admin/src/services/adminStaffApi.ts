import { createApi } from '@reduxjs/toolkit/query/react'

import { normalizeStaff } from '@/lib/staff'
import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/api'
import type { CreateStaffInput, StaffAdmin, StaffStats, UpdateStaffInput } from '@/types/staff'

type StaffList = ApiSuccess<{
  admins: StaffAdmin[]
  pagination: { page: number; limit: number; total: number; pages: number }
}>

type StaffOne = ApiSuccess<{ admin: StaffAdmin }>

export const adminStaffApi = createApi({
  reducerPath: 'adminStaffApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Staff'],
  endpoints: (builder) => ({
    listStaff: builder.query<
      StaffList,
      { page?: number; limit?: number; search?: string; role?: string; isActive?: 'true' | 'false' }
    >({
      query: (params) => ({ url: '/admin-management/list', params }),
      transformResponse: (response: StaffList) => ({
        ...response,
        data: {
          ...response.data,
          admins: (response.data.admins ?? []).map(normalizeStaff),
        },
      }),
      providesTags: ['Staff'],
    }),
    getStaffStats: builder.query<ApiSuccess<{ stats: StaffStats }>, void>({
      query: () => '/admin-management/stats/overview',
      providesTags: ['Staff'],
    }),
    getStaff: builder.query<StaffOne, string>({
      query: (id) => `/admin-management/${id}`,
      transformResponse: (response: StaffOne) => ({
        ...response,
        data: { admin: normalizeStaff(response.data.admin) },
      }),
      providesTags: ['Staff'],
    }),
    createStaff: builder.mutation<StaffOne, CreateStaffInput>({
      query: (body) => ({ url: '/admin-management/create', method: 'POST', body }),
      transformResponse: (response: StaffOne) => ({
        ...response,
        data: { admin: normalizeStaff(response.data.admin) },
      }),
      invalidatesTags: ['Staff'],
    }),
    updateStaff: builder.mutation<StaffOne, { id: string } & UpdateStaffInput>({
      query: ({ id, ...body }) => ({ url: `/admin-management/${id}`, method: 'PUT', body }),
      transformResponse: (response: StaffOne) => ({
        ...response,
        data: { admin: normalizeStaff(response.data.admin) },
      }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/admin-management/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Staff'],
    }),
    setStaffPassword: builder.mutation<{ success: true }, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({
        url: `/admin-management/${id}/password`,
        method: 'PATCH',
        body: { newPassword },
      }),
      invalidatesTags: ['Staff'],
    }),
    toggleStaffStatus: builder.mutation<ApiSuccess<{ admin: { _id: string; isActive: boolean } }>, string>({
      query: (id) => ({ url: `/admin-management/${id}/toggle-status`, method: 'PATCH', body: {} }),
      invalidatesTags: ['Staff'],
    }),
  }),
})

export const {
  useListStaffQuery,
  useGetStaffStatsQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
  useSetStaffPasswordMutation,
  useToggleStaffStatusMutation,
} = adminStaffApi
