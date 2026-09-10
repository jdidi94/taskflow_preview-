import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type {
  AdminAuditLog,
  AdminAuditStats,
  AdminInboxNotification,
  AdminNotificationPriority,
  AdminNotificationStats,
} from '@/types/activity'
import type { ApiSuccess } from '@/types/api'

type PageQuery = {
  page?: number
  limit?: number
  isRead?: 'true' | 'false'
  q?: string
  action?: string
  targetType?: string
}

type Paginated<T> = {
  pagination: { page: number; limit: number; totalItems: number; pages: number }
} & T

export const adminActivityApi = createApi({
  reducerPath: 'adminActivityApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['AdminNotifications', 'AdminAudit'],
  endpoints: (builder) => ({
    listAdminNotifications: builder.query<
      ApiSuccess<Paginated<{ notifications: AdminInboxNotification[]; unreadCount: number }>>,
      PageQuery
    >({
      query: (params) => ({ url: '/admin/notifications', params }),
      providesTags: ['AdminNotifications'],
    }),
    getAdminNotificationStats: builder.query<ApiSuccess<{ stats: AdminNotificationStats }>, void>({
      query: () => '/admin/notifications/stats',
      providesTags: ['AdminNotifications'],
    }),
    markAdminNotificationRead: builder.mutation<ApiSuccess<{ notification: AdminInboxNotification }>, string>({
      query: (id) => ({ url: `/admin/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['AdminNotifications'],
    }),
    markAllAdminNotificationsRead: builder.mutation<ApiSuccess<unknown>, void>({
      query: () => ({ url: '/admin/notifications/mark-all-read', method: 'POST' }),
      invalidatesTags: ['AdminNotifications'],
    }),
    deleteAdminNotification: builder.mutation<ApiSuccess<unknown>, string>({
      query: (id) => ({ url: `/admin/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminNotifications'],
    }),
    broadcastAdminNotification: builder.mutation<
      ApiSuccess<{ count: number }>,
      { title: string; message: string; priority?: AdminNotificationPriority; href?: string }
    >({
      query: (body) => ({ url: '/admin/notifications/broadcast', method: 'POST', body }),
      invalidatesTags: ['AdminNotifications', 'AdminAudit'],
    }),
    listAdminAuditLogs: builder.query<ApiSuccess<Paginated<{ logs: AdminAuditLog[] }>>, PageQuery>({
      query: (params) => ({ url: '/admin/audit-logs', params }),
      providesTags: ['AdminAudit'],
    }),
    getAdminAuditStats: builder.query<ApiSuccess<{ stats: AdminAuditStats }>, void>({
      query: () => '/admin/audit-logs/stats',
      providesTags: ['AdminAudit'],
    }),
  }),
})

export const {
  useListAdminNotificationsQuery,
  useGetAdminNotificationStatsQuery,
  useMarkAdminNotificationReadMutation,
  useMarkAllAdminNotificationsReadMutation,
  useDeleteAdminNotificationMutation,
  useBroadcastAdminNotificationMutation,
  useListAdminAuditLogsQuery,
  useGetAdminAuditStatsQuery,
} = adminActivityApi
