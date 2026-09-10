export const ADMIN_ANALYTICS_RANGES = ['1-month', '3-months', '6-months', '1-year'] as const

export type AdminAnalyticsTimeRange = (typeof ADMIN_ANALYTICS_RANGES)[number]
export type AdminAnalyticsGranularity = 'day' | 'week' | 'month'

export type UserGrowthPoint = {
  date: string
  month: string
  signups: number
}

export type ProjectTrendPoint = {
  date: string
  month: string
  projects: number
}

export type AdminAnalytics = {
  timeRange?: AdminAnalyticsTimeRange
  granularity?: AdminAnalyticsGranularity
  rangeStart?: string
  rangeEnd?: string
  totalUsers: number
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  activeProjects: number
  totalWorkspaces?: number
  completionRate: number
  taskCompletionData: {
    pending: number
    inProgress: number
    completed: number
  }
  userGrowthData?: UserGrowthPoint[]
  projectCreationTrends?: ProjectTrendPoint[]
  systemPerformance: {
    serverUptime: number
    apiResponseTime: number
    databaseHealth: number
  }
}

export function isAdminAnalyticsTimeRange(value: string): value is AdminAnalyticsTimeRange {
  return (ADMIN_ANALYTICS_RANGES as readonly string[]).includes(value)
}
