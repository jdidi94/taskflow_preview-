import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/domain'

export type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year'

export type UserAnalyticsPayload = {
  analytics: {
    tasksAssigned?: number
    tasksCompleted?: number
    completionRate?: number
    activityHeatmap?: Array<{ date: string; value: number }>
    [key: string]: unknown
  }
  period?: string
}

export type ScopeAnalytics = {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionRate: number
  averageCompletionTime: number
  totalMembers: number
  activeMembers: number
  taskMetrics?: {
    priorityDistribution?: {
      low: number
      medium: number
      high: number
      urgent: number
    }
  }
  teamMetrics?: {
    topPerformers?: Array<{ name: string; tasksCompleted: number }>
    workloadDistribution?: Array<{ member: string; tasks: number }>
  }
  timeSeries?: {
    dailyActivity?: Array<{ date: string; tasks: number }>
    weeklyTrends?: Array<{ week: string; completed: number; created: number }>
  }
}

export type ScopeAnalyticsPayload = {
  analytics: ScopeAnalytics
  period: AnalyticsPeriod
  count?: number
}

export type TeamPerformancePayload = {
  analytics: {
    topPerformers?: Array<{ name: string; tasksCompleted: number }>
    workloadDistribution?: Array<{ member: string; tasks: number }>
    teamVelocity?: number
    collaborationScore?: number
  }
  period: AnalyticsPeriod
  spaceId: string
}

type RangeArgs = {
  period?: AnalyticsPeriod
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Analytics'],
  endpoints: (builder) => ({
    getUserAnalytics: builder.query<ApiSuccess<UserAnalyticsPayload>, { range?: string } | void>({
      query: (params) => {
        const range = params && typeof params === 'object' && params.range ? params.range : '3m'
        return `/analytics/user?range=${encodeURIComponent(range)}`
      },
      providesTags: [{ type: 'Analytics', id: 'USER' }],
    }),
    getWorkspaceAnalytics: builder.query<
      ApiSuccess<ScopeAnalyticsPayload>,
      { workspaceId: string } & RangeArgs
    >({
      query: ({ workspaceId, period = 'month' }) =>
        `/analytics/workspace/${encodeURIComponent(workspaceId)}?period=${encodeURIComponent(period)}`,
      providesTags: (_result, _error, arg) => [{ type: 'Analytics', id: `WS-${arg.workspaceId}` }],
    }),
    getSpaceAnalytics: builder.query<
      ApiSuccess<ScopeAnalyticsPayload>,
      { spaceId: string } & RangeArgs
    >({
      query: ({ spaceId, period = 'month' }) =>
        `/analytics/space/${encodeURIComponent(spaceId)}?period=${encodeURIComponent(period)}`,
      providesTags: (_result, _error, arg) => [{ type: 'Analytics', id: `SP-${arg.spaceId}` }],
    }),
    getTeamPerformance: builder.query<
      ApiSuccess<TeamPerformancePayload>,
      { spaceId: string } & RangeArgs
    >({
      query: ({ spaceId, period = 'month' }) =>
        `/analytics/space/${encodeURIComponent(spaceId)}/team-performance?period=${encodeURIComponent(period)}`,
      providesTags: (_result, _error, arg) => [{ type: 'Analytics', id: `TP-${arg.spaceId}` }],
    }),
  }),
})

export const {
  useGetUserAnalyticsQuery,
  useGetWorkspaceAnalyticsQuery,
  useGetSpaceAnalyticsQuery,
  useGetTeamPerformanceQuery,
} = analyticsApi
