import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { AiToken, AiTokenStats, AiTokenTestResult, CreateAiTokenInput } from '@/types/ai'
import type { ApiSuccess } from '@/types/api'

export const adminAiTokensApi = createApi({
  reducerPath: 'adminAiTokensApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['AiTokens', 'AiTokenStats'],
  endpoints: (builder) => ({
    listAiTokens: builder.query<ApiSuccess<{ tokens: AiToken[] }>, { includeArchived?: boolean } | void>({
      query: (params) => ({
        url: '/admin/ai-tokens',
        params: params ? { includeArchived: params.includeArchived } : undefined,
      }),
      providesTags: ['AiTokens'],
    }),
    getAiTokenStats: builder.query<ApiSuccess<{ stats: AiTokenStats }>, void>({
      query: () => '/admin/ai-tokens/stats',
      providesTags: ['AiTokenStats'],
    }),
    createAiToken: builder.mutation<ApiSuccess<{ token: AiToken }>, CreateAiTokenInput>({
      query: (body) => ({ url: '/admin/ai-tokens', method: 'POST', body }),
      invalidatesTags: ['AiTokens', 'AiTokenStats'],
    }),
    activateAiToken: builder.mutation<ApiSuccess<{ token: AiToken }>, string>({
      query: (tokenId) => ({ url: `/admin/ai-tokens/${tokenId}/activate`, method: 'POST' }),
      invalidatesTags: ['AiTokens', 'AiTokenStats'],
    }),
    archiveAiToken: builder.mutation<ApiSuccess<{ token: AiToken }>, string>({
      query: (tokenId) => ({ url: `/admin/ai-tokens/${tokenId}/archive`, method: 'POST' }),
      invalidatesTags: ['AiTokens', 'AiTokenStats'],
    }),
    deleteAiToken: builder.mutation<{ success: true }, string>({
      query: (tokenId) => ({ url: `/admin/ai-tokens/${tokenId}`, method: 'DELETE' }),
      invalidatesTags: ['AiTokens', 'AiTokenStats'],
    }),
    testAiToken: builder.mutation<ApiSuccess<AiTokenTestResult>, string>({
      query: (tokenId) => ({ url: `/admin/ai-tokens/${tokenId}/test`, method: 'POST' }),
      invalidatesTags: ['AiTokens', 'AiTokenStats'],
    }),
  }),
})

export const {
  useListAiTokensQuery,
  useGetAiTokenStatsQuery,
  useCreateAiTokenMutation,
  useActivateAiTokenMutation,
  useArchiveAiTokenMutation,
  useDeleteAiTokenMutation,
  useTestAiTokenMutation,
} = adminAiTokensApi
