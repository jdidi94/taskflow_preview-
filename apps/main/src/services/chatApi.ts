import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import { normalizeChat, normalizeChatMessage, type ChatMessage, type ChatThread } from '@/types/chat'

type ApiSuccess<T> = { success: true; data: T }

const CHAT_STORAGE_KEY = 'taskflow-support-chat-id'

export function getStoredChatId() {
  return localStorage.getItem(CHAT_STORAGE_KEY)
}

export function setStoredChatId(id: string) {
  localStorage.setItem(CHAT_STORAGE_KEY, id)
}

export function clearStoredChatId() {
  localStorage.removeItem(CHAT_STORAGE_KEY)
}

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Chat'],
  endpoints: (builder) => ({
    startChat: builder.mutation<ApiSuccess<{ chat: ChatThread }>, { message: string }>({
      query: (body) => ({
        url: '/chat/widget/start',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiSuccess<{ chat: Record<string, unknown> }>) => ({
        ...response,
        data: { chat: normalizeChat(response.data.chat) },
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        const { data } = await queryFulfilled
        if (data.data.chat.id) setStoredChatId(data.data.chat.id)
      },
      invalidatesTags: [{ type: 'Chat', id: 'CURRENT' }],
    }),
    getChatHistory: builder.query<ApiSuccess<{ messages: ChatMessage[]; chatId: string }>, string>({
      query: (chatId) => `/chat/widget/${chatId}/history?limit=200`,
      transformResponse: (
        response: ApiSuccess<{ messages?: Record<string, unknown>[]; chat?: Record<string, unknown> }>,
        _meta,
        chatId,
      ) => {
        const list = response.data.messages ?? (response.data.chat?.messages as Record<string, unknown>[] | undefined) ?? []
        return {
          success: true as const,
          data: {
            chatId,
            messages: list.map((item) => normalizeChatMessage(item)),
          },
        }
      },
      providesTags: (_result, _error, chatId) => [{ type: 'Chat', id: chatId }],
    }),
    sendChatMessage: builder.mutation<
      ApiSuccess<{ message: ChatMessage }>,
      { chatId: string; content: string }
    >({
      query: ({ chatId, content }) => ({
        url: `/chat/widget/${chatId}/message`,
        method: 'POST',
        body: { content },
      }),
      transformResponse: (response: ApiSuccess<{ message: Record<string, unknown> }>) => ({
        ...response,
        data: { message: normalizeChatMessage(response.data.message) },
      }),
      async onQueryStarted({ chatId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(
            chatApi.util.updateQueryData('getChatHistory', chatId, (draft) => {
              const exists = draft.data.messages.some((item) => item.id === data.data.message.id)
              if (!exists) draft.data.messages.push(data.data.message)
            }),
          )
        } catch {
          // ignore
        }
      },
    }),
  }),
})

export const { useStartChatMutation, useGetChatHistoryQuery, useSendChatMessageMutation } = chatApi
