import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'
import {
  normalizeNotification,
  type AppNotification,
  type NotificationListData,
  type NotificationStats,
} from '@/types/notification'

type ApiSuccess<T> = { success: true; data: T }

type ListArgs = {
  page?: number
  limit?: number
  isRead?: 'true' | 'false'
}

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery,
  tagTypes: ['Notifications', 'NotificationStats'],
  endpoints: (builder) => ({
    listNotifications: builder.query<ApiSuccess<NotificationListData>, ListArgs | void>({
      query: (args) => {
        const params = new URLSearchParams()
        const page = args && typeof args === 'object' ? (args.page ?? 1) : 1
        const limit = args && typeof args === 'object' ? (args.limit ?? 50) : 50
        params.set('page', String(page))
        params.set('limit', String(limit))
        if (args && typeof args === 'object' && args.isRead) params.set('isRead', args.isRead)
        return `/notifications?${params.toString()}`
      },
      transformResponse: (response: ApiSuccess<NotificationListData>) => ({
        ...response,
        data: {
          ...response.data,
          notifications: (response.data.notifications ?? []).map((item) =>
            normalizeNotification(item as AppNotification & Record<string, unknown>),
          ),
        },
      }),
      providesTags: (result) =>
        result?.data.notifications
          ? [
              ...result.data.notifications.map((item) => ({
                type: 'Notifications' as const,
                id: item.id,
              })),
              { type: 'Notifications', id: 'LIST' },
            ]
          : [{ type: 'Notifications', id: 'LIST' }],
    }),
    getNotificationStats: builder.query<ApiSuccess<{ stats: NotificationStats }>, void>({
      query: () => '/notifications/stats',
      providesTags: [{ type: 'NotificationStats', id: 'STATS' }],
    }),
    markAsRead: builder.mutation<ApiSuccess<{ notification: AppNotification }>, { id: string }>({
      query: ({ id }) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Notifications', id: arg.id },
        { type: 'Notifications', id: 'LIST' },
        { type: 'NotificationStats', id: 'STATS' },
      ],
    }),
    markAllAsRead: builder.mutation<ApiSuccess<{ modifiedCount: number }>, void>({
      query: () => ({
        url: '/notifications/mark-all-read',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notifications', id: 'LIST' },
        { type: 'NotificationStats', id: 'STATS' },
      ],
    }),
    deleteNotification: builder.mutation<{ success: true }, { id: string }>({
      query: ({ id }) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Notifications', id: arg.id },
        { type: 'Notifications', id: 'LIST' },
        { type: 'NotificationStats', id: 'STATS' },
      ],
    }),
    clearRead: builder.mutation<ApiSuccess<{ deletedCount: number }>, void>({
      query: () => ({
        url: '/notifications/clear-read',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notifications', id: 'LIST' },
        { type: 'NotificationStats', id: 'STATS' },
      ],
    }),
  }),
})

export const {
  useListNotificationsQuery,
  useGetNotificationStatsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useClearReadMutation,
} = notificationsApi
