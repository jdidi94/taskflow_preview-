import mongoose from 'mongoose'

import { Space } from '../models/Space.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { Workspace } from '../models/Workspace.js'

export const ADMIN_ANALYTICS_RANGES = ['1-month', '3-months', '6-months', '1-year'] as const

export type AdminAnalyticsTimeRange = (typeof ADMIN_ANALYTICS_RANGES)[number]
export type AdminAnalyticsGranularity = 'day' | 'week' | 'month'

export type AdminAnalyticsSeriesPoint = {
  date: string
  label: string
  value: number
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

export function resolveAdminAnalyticsRange(timeRange: AdminAnalyticsTimeRange = '6-months') {
  const end = new Date()
  const start = new Date(end)

  if (timeRange === '1-month') {
    start.setUTCDate(start.getUTCDate() - 29)
    return { start: startOfUtcDay(start), end, granularity: 'day' as const, timeRange }
  }
  if (timeRange === '3-months') {
    start.setUTCMonth(start.getUTCMonth() - 3)
    return { start: startOfUtcDay(start), end, granularity: 'week' as const, timeRange }
  }
  if (timeRange === '1-year') {
    start.setUTCFullYear(start.getUTCFullYear() - 1)
    return {
      start: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)),
      end,
      granularity: 'month' as const,
      timeRange,
    }
  }

  start.setUTCMonth(start.getUTCMonth() - 6)
  return {
    start: new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1)),
    end,
    granularity: 'month' as const,
    timeRange: '6-months' as const,
  }
}

function mondayOf(date: Date) {
  const day = startOfUtcDay(date)
  const weekday = day.getUTCDay()
  const offset = weekday === 0 ? -6 : 1 - weekday
  day.setUTCDate(day.getUTCDate() + offset)
  return day
}

function bucketKey(date: Date, granularity: AdminAnalyticsGranularity) {
  if (granularity === 'day') return date.toISOString().slice(0, 10)
  if (granularity === 'month') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }
  return mondayOf(date).toISOString().slice(0, 10)
}

function enumerateBuckets(start: Date, end: Date, granularity: AdminAnalyticsGranularity) {
  const buckets: Array<{ date: string; label: string }> = []

  if (granularity === 'day') {
    for (let current = startOfUtcDay(start); current <= end; current = new Date(current.getTime() + 86_400_000)) {
      const key = current.toISOString().slice(0, 10)
      buckets.push({ date: key, label: key })
    }
    return buckets
  }

  if (granularity === 'week') {
    for (let current = mondayOf(start); current <= end; current = new Date(current.getTime() + 7 * 86_400_000)) {
      const key = current.toISOString().slice(0, 10)
      buckets.push({ date: key, label: key })
    }
    return buckets
  }

  let current = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1))
  while (current <= last) {
    const label = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`
    buckets.push({ date: current.toISOString().slice(0, 10), label })
    current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 1))
  }
  return buckets
}

type DatedDoc = { createdAt?: Date | string }

function toSeries(
  dates: DatedDoc[],
  start: Date,
  end: Date,
  granularity: AdminAnalyticsGranularity,
): AdminAnalyticsSeriesPoint[] {
  const counts = new Map<string, number>()
  for (const doc of dates) {
    if (!doc.createdAt) continue
    const key = bucketKey(new Date(doc.createdAt), granularity)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return enumerateBuckets(start, end, granularity).map((bucket) => ({
    date: bucket.date,
    label: bucket.label,
    value: counts.get(bucket.label) ?? 0,
  }))
}

export async function buildAdminAnalyticsSnapshot(timeRange: AdminAnalyticsTimeRange = '6-months') {
  const range = resolveAdminAnalyticsRange(timeRange)
  const createdInRange = { createdAt: { $gte: range.start, $lte: range.end } }

  const [
    totalUsers,
    dailyActive,
    weeklyActive,
    monthlyActive,
    totalWorkspaces,
    totalSpaces,
    totalTasks,
    completedTasks,
    pendingTasks,
    inProgressTasks,
    userCreated,
    spaceCreated,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true, lastLogin: { $gte: daysAgo(1) } }),
    User.countDocuments({ isActive: true, lastLogin: { $gte: daysAgo(7) } }),
    User.countDocuments({ isActive: true, lastLogin: { $gte: daysAgo(30) } }),
    Workspace.countDocuments({ isActive: true }),
    Space.countDocuments({ isActive: true }),
    Task.countDocuments({ archived: false }),
    Task.countDocuments({ archived: false, status: 'done' }),
    Task.countDocuments({ archived: false, status: 'todo' }),
    Task.countDocuments({ archived: false, status: 'in_progress' }),
    User.find(createdInRange).select({ createdAt: 1 }).lean() as Promise<DatedDoc[]>,
    Space.find(createdInRange).select({ createdAt: 1 }).lean() as Promise<DatedDoc[]>,
  ])

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const userGrowth = toSeries(userCreated, range.start, range.end, range.granularity)
  const projectTrends = toSeries(spaceCreated, range.start, range.end, range.granularity)

  return {
    timeRange: range.timeRange,
    granularity: range.granularity,
    rangeStart: range.start.toISOString(),
    rangeEnd: range.end.toISOString(),
    totalUsers,
    activeUsers: {
      daily: dailyActive,
      weekly: weeklyActive,
      monthly: monthlyActive,
    },
    activeProjects: totalSpaces,
    totalWorkspaces,
    completionRate: Math.round(completionRate * 100) / 100,
    taskCompletionData: {
      pending: pendingTasks,
      inProgress: inProgressTasks,
      completed: completedTasks,
    },
    userGrowthData: userGrowth.map((point) => ({
      date: point.date,
      month: point.label,
      signups: point.value,
    })),
    projectCreationTrends: projectTrends.map((point) => ({
      date: point.date,
      month: point.label,
      projects: point.value,
    })),
    systemPerformance: {
      serverUptime: process.uptime(),
      apiResponseTime: 0,
      databaseHealth: mongoose.connection.readyState === 1 ? 100 : 0,
    },
  }
}
