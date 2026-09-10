import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { AdminAnalytics, AdminAnalyticsTimeRange } from '@/types/analytics'
import type { ApiSuccess } from '@/types/api'
import type { SystemHealthSnapshot } from '@/types/health'

export const adminAnalyticsApi = createApi({
  reducerPath: 'adminAnalyticsApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Analytics'],
  endpoints: (builder) => ({
    getAnalytics: builder.query<ApiSuccess<AdminAnalytics>, AdminAnalyticsTimeRange | void>({
      query: (timeRange) => (timeRange ? `/admin/analytics?timeRange=${timeRange}` : '/admin/analytics'),
      providesTags: ['Analytics'],
    }),
    getSystemHealth: builder.query<ApiSuccess<SystemHealthSnapshot>, void>({
      query: () => '/admin/system/health',
    }),
  }),
})

export const { useGetAnalyticsQuery, useGetSystemHealthQuery } = adminAnalyticsApi
