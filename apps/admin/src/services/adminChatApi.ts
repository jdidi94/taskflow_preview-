import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/api'
import type { ChatMessage, ChatStats, ChatStatus, SupportChat } from '@/types/chat'

export const adminChatApi = createApi({
  reducerPath: 'adminChatApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Chats', 'ChatStats', 'ChatMessages'],
  endpoints: (builder) => ({
    listActiveChats: builder.query<ApiSuccess<{ chats: SupportChat[] }>, void>({
      query: () => '/chat/admin/active',
      providesTags: ['Chats'],
    }),
    getChatStats: builder.query<ApiSuccess<{ stats: ChatStats }>, void>({
      query: () => '/chat/admin/stats',
      providesTags: ['ChatStats'],
    }),
    getChatHistory: builder.query<ApiSuccess<{ messages: ChatMessage[] }>, string>({
      query: (chatId) => `/chat/admin/${chatId}/history?limit=100`,
      providesTags: (_result, _error, chatId) => [{ type: 'ChatMessages', id: chatId }],
    }),
    acceptChat: builder.mutation<ApiSuccess<{ chat: SupportChat }>, string>({
      query: (chatId) => ({ url: `/chat/admin/${chatId}/accept`, method: 'POST', body: {} }),
      invalidatesTags: ['Chats', 'ChatStats'],
    }),
    sendChatMessage: builder.mutation<ApiSuccess<{ message: ChatMessage }>, { chatId: string; content: string }>({
      query: ({ chatId, content }) => ({
        url: `/chat/admin/${chatId}/messages`,
        method: 'POST',
        body: { content, messageType: 'text' },
      }),
      invalidatesTags: (_result, _error, arg) => ['Chats', 'ChatStats', { type: 'ChatMessages', id: arg.chatId }],
    }),
    updateChatStatus: builder.mutation<ApiSuccess<{ chat: SupportChat }>, { chatId: string; status: ChatStatus; reason?: string }>(
      {
        query: ({ chatId, status, reason }) => ({
          url: `/chat/admin/${chatId}/status`,
          method: 'PATCH',
          body: { status, reason },
        }),
        invalidatesTags: ['Chats', 'ChatStats'],
      },
    ),
    closeChat: builder.mutation<ApiSuccess<{ chat: SupportChat }>, { chatId: string; reason?: string }>({
      query: ({ chatId, reason }) => ({
        url: `/chat/admin/${chatId}/close`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Chats', 'ChatStats'],
    }),
    markChatRead: builder.mutation<{ success: true }, { chatId: string; messageIds: string[] }>({
      query: ({ chatId, messageIds }) => ({
        url: `/chat/admin/${chatId}/read`,
        method: 'POST',
        body: { messageIds },
      }),
      invalidatesTags: ['ChatStats'],
    }),
  }),
})

export const {
  useListActiveChatsQuery,
  useGetChatStatsQuery,
  useLazyGetChatHistoryQuery,
  useAcceptChatMutation,
  useSendChatMessageMutation,
  useUpdateChatStatusMutation,
  useCloseChatMutation,
  useMarkChatReadMutation,
} = adminChatApi
