import { getAccessToken, getOrCreateDeviceId } from '@/lib/authToken'

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function downloadSpaceAnalyticsCsv(spaceId: string, period: string) {
  const token = getAccessToken()
  const params = new URLSearchParams({ format: 'csv', period })
  const response = await fetch(`/api/analytics/space/${encodeURIComponent(spaceId)}/export?${params}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-device-id': getOrCreateDeviceId(),
    },
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? `Export failed (${response.status})`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `space-analytics-${spaceId}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function buildScopeAnalyticsCsv(analytics: {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionRate: number
  averageCompletionTime: number
  taskMetrics?: {
    priorityDistribution?: {
      low: number
      medium: number
      high: number
      urgent: number
    }
  }
}) {
  const priority = analytics.taskMetrics?.priorityDistribution ?? {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  }
  const headers = [
    'totalTasks',
    'completedTasks',
    'inProgressTasks',
    'overdueTasks',
    'completionRate',
    'averageCompletionTimeHours',
    'priorityLow',
    'priorityMedium',
    'priorityHigh',
    'priorityUrgent',
  ]
  const row = [
    analytics.totalTasks,
    analytics.completedTasks,
    analytics.inProgressTasks,
    analytics.overdueTasks,
    analytics.completionRate,
    analytics.averageCompletionTime,
    priority.low,
    priority.medium,
    priority.high,
    priority.urgent,
  ]
  return `${headers.join(',')}\n${row.join(',')}\n`
}
