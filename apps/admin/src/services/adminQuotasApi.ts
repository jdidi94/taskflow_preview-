import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/api'
import type { CreateQuotaInput, Quota, QuotaStatsMap, UpdateQuotaInput } from '@/types/quotas'

export const adminQuotasApi = createApi({
  reducerPath: 'adminQuotasApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Quotas', 'QuotaStats'],
  endpoints: (builder) => ({
    listQuotas: builder.query<ApiSuccess<{ quotas: Quota[] }>, void>({
      query: () => '/admin/quotas',
      providesTags: ['Quotas'],
    }),
    getQuotaStats: builder.query<ApiSuccess<{ stats: QuotaStatsMap }>, void>({
      query: () => '/admin/quotas/stats',
      providesTags: ['QuotaStats'],
    }),
    createQuota: builder.mutation<ApiSuccess<{ quota: Quota }>, CreateQuotaInput>({
      query: (body) => ({ url: '/admin/quotas', method: 'POST', body }),
      invalidatesTags: ['Quotas', 'QuotaStats'],
    }),
    updateQuota: builder.mutation<ApiSuccess<{ quota: Quota }>, { id: string } & UpdateQuotaInput>({
      query: ({ id, ...body }) => ({ url: `/admin/quotas/${id}`, method: 'PUT', body }),
      invalidatesTags: ['Quotas', 'QuotaStats'],
    }),
    deleteQuota: builder.mutation<{ success: true }, string>({
      query: (id) => ({ url: `/admin/quotas/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Quotas', 'QuotaStats'],
    }),
    overrideQuota: builder.mutation<
      ApiSuccess<{ quota: Quota }>,
      { id: string; reason: string; expiresAt?: string | null }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/quotas/${id}/override`, method: 'POST', body }),
      invalidatesTags: ['Quotas', 'QuotaStats'],
    }),
    clearQuotaOverride: builder.mutation<ApiSuccess<{ quota: Quota }>, string>({
      query: (id) => ({ url: `/admin/quotas/${id}/override`, method: 'DELETE' }),
      invalidatesTags: ['Quotas', 'QuotaStats'],
    }),
    resetQuota: builder.mutation<ApiSuccess<{ quota: Quota }>, string>({
      query: (id) => ({ url: `/admin/quotas/${id}/reset`, method: 'POST' }),
      invalidatesTags: ['Quotas', 'QuotaStats'],
    }),
  }),
})

export const {
  useListQuotasQuery,
  useGetQuotaStatsQuery,
  useCreateQuotaMutation,
  useUpdateQuotaMutation,
  useDeleteQuotaMutation,
  useOverrideQuotaMutation,
  useClearQuotaOverrideMutation,
  useResetQuotaMutation,
} = adminQuotasApi
