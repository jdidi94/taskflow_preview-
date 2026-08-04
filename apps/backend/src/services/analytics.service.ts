import { Types } from 'mongoose'
import { AppError } from '../utils/AppError.js'
import { Task } from '../models/Task.js'
import { Space, type ISpace } from '../models/Space.js'
import { Workspace, type IWorkspace } from '../models/Workspace.js'
import { User } from '../models/User.js'

type AnalyticsPeriod = 'week' | 'month' | 'quarter' | 'year'
type AnalyticsRange = { start: Date; end: Date; period: AnalyticsPeriod }

function toDayKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function clampRange(start: Date, end: Date): AnalyticsRange {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new AppError('Invalid date range', 400)
  }
  if (start > end) throw new AppError('startDate must be <= endDate', 400)
  return { start, end, period: 'month' }
}

function daysForPeriod(period: AnalyticsPeriod): number {
  switch (period) {
    case 'week':
      return 7
    case 'month':
      return 30
    case 'quarter':
      return 90
    case 'year':
      return 365
  }
}

function resolveRange(args: {
  period?: AnalyticsPeriod
  startDate?: string
  endDate?: string
}): AnalyticsRange {
  const period: AnalyticsPeriod = args.period ?? 'month'

  if (args.startDate || args.endDate) {
    const start = args.startDate ? new Date(args.startDate) : new Date(Date.now() - daysForPeriod(period) * 24 * 60 * 60 * 1000)
    const end = args.endDate ? new Date(args.endDate) : new Date()
    const normalized = clampRange(start, end)
    return { ...normalized, period }
  }

  const end = new Date()
  const start = new Date(end.getTime() - daysForPeriod(period) * 24 * 60 * 60 * 1000)
  return { start, end, period }
}

function hourOfDayUTC(d: Date): number {
  return d.getUTCHours()
}

function computeTaskMetrics(tasks: Array<any>, now: Date) {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'done' && !t.archived).length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress' && !t.archived).length

  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate) return false
    const due = new Date(t.dueDate)
    return due < now && t.status !== 'done' && !t.archived
  }).length

  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

  const completedForTime = tasks.filter((t) => t.status === 'done' && !t.archived && t.updatedAt && t.createdAt)
  const avgCompletionMs =
    completedForTime.length > 0
      ? completedForTime.reduce((sum, t) => sum + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0) /
        completedForTime.length
      : 0
  const averageCompletionTime = Math.round((avgCompletionMs / (1000 * 60 * 60)) * 100) / 100

  const priorityDistribution = {
    low: tasks.filter((t) => t.priority === 'low' && !t.archived).length,
    medium: tasks.filter((t) => t.priority === 'medium' && !t.archived).length,
    high: tasks.filter((t) => t.priority === 'high' && !t.archived).length,
    urgent: tasks.filter((t) => t.priority === 'critical' && !t.archived).length,
  }

  return {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    completionRate: Math.round(completionRate * 100) / 100,
    averageCompletionTime,
    totalTimeSpent: 0,
    taskMetrics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      priorityDistribution,
    },
    timeMetrics: {
      averageCompletionTime,
      totalTimeSpent: 0,
      totalEstimated: 0,
      totalActual: 0,
      averageAccuracy: 0,
      totalOvertime: 0,
    },
    qualityMetrics: {
      customerSatisfaction: 0,
      bugRate: 0,
      reworkRate: 0,
      blockedTasks: 0,
      cycleTime: 0,
    },
  }
}

function computeTimeInsights(tasks: any[], range: AnalyticsRange): {
  peakHours: Array<{ hour: number; activity: number }>
  dailyActivity: Array<{ date: string; tasks: number }>
  weeklyTrends: Array<{ week: string; completed: number; created: number }>
} {
  const now = range.end
  void now

  const peak = Array.from({ length: 24 }, () => 0)
  for (const t of tasks) {
    if (!t.updatedAt) continue
    peak[hourOfDayUTC(new Date(t.updatedAt))]++
  }

  // dailyActivity for [range.start, range.end]
  const dayKeys: string[] = []
  const start = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), range.start.getUTCDate()))
  const end = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), range.end.getUTCDate()))
  for (let cur = new Date(start.getTime()); cur <= end; cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)) {
    dayKeys.push(toDayKeyUTC(cur))
  }

  const byDay: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]))
  for (const t of tasks) {
    if (!t.updatedAt) continue
    const key = toDayKeyUTC(new Date(t.updatedAt))
    if (byDay[key] !== undefined) byDay[key]++
  }

  const dailyActivity = dayKeys.map((date) => ({ date, tasks: byDay[date] ?? 0 }))

  // weeklyTrends: group weeks of 7 days from range.start
  const weeklyTrends: Array<{ week: string; completed: number; created: number }> = []
  const totalDays = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000)))
  const weeks = Math.max(1, Math.ceil(totalDays / 7))
  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(range.start.getTime() + w * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(Math.min(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000, range.end.getTime()))
    const created = tasks.filter((t) => t.createdAt && new Date(t.createdAt).getTime() >= weekStart.getTime() && new Date(t.createdAt).getTime() < weekEnd.getTime())
    const completed = created.filter((t) => t.status === 'done' && !t.archived)
    weeklyTrends.push({
      week: `Week ${w + 1}`,
      completed: completed.length,
      created: created.length,
    })
  }

  return {
    peakHours: peak.map((activity, hour) => ({ hour, activity })),
    dailyActivity,
    weeklyTrends,
  }
}

function computeTeamMetrics(args: { members: Array<{ user: any }>; tasks: any[] }) {
  const byMember: Record<string, { tasks: number; completed: number; name: string }> = {}
  for (const m of args.members) {
    byMember[String(m.user._id)] = { tasks: 0, completed: 0, name: m.user.name ?? 'Unknown' }
  }

  for (const t of args.tasks) {
    const participants = new Set<string>()
    if (t.reporter) participants.add(String(t.reporter))
    if (Array.isArray(t.assignees)) for (const a of t.assignees) participants.add(String(a))
    if (Array.isArray(t.watchers)) for (const w of t.watchers) participants.add(String(w))

    for (const pid of participants) {
      if (!byMember[pid]) continue
      byMember[pid].tasks += 1
      if (t.status === 'done' && !t.archived) byMember[pid].completed += 1
    }
  }

  const membersMetrics = Object.entries(byMember).map(([memberId, v]) => ({
    memberId,
    name: v.name,
    tasks: v.tasks,
    completed: v.completed,
  }))

  const totalMembers = args.members.length
  const activeMembers = membersMetrics.filter((m) => m.tasks > 0).length

  const topPerformers = membersMetrics
    .slice()
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 5)
    .map((m) => ({ name: m.name, tasksCompleted: m.completed }))

  const workloadDistribution = membersMetrics.map((m) => ({ member: m.name, tasks: m.tasks }))

  return {
    totalMembers,
    activeMembers,
    topPerformers,
    workloadDistribution,
  }
}

async function populateSpaceMembers(space: ISpace) {
  // Ensure member.user populated to compute names + ids
  await space.populate('members.user', 'name email avatar')
  return space
}

async function populateWorkspaceMembers(workspace: IWorkspace) {
  await workspace.populate('members.user', 'name email avatar')
  return workspace
}

export const analyticsService = {
  resolveRange,

  async getSpaceAnalytics(spaceId: string, userId: string, rangeInput: { period?: AnalyticsPeriod; startDate?: string; endDate?: string }) {
    const range = resolveRange(rangeInput)
    const now = new Date()

    const space = await Space.findById(spaceId)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)
    await populateSpaceMembers(space)
    if (!space.members?.length) {
      // Still compute core metrics without team details
    }

    const tasks = (await Task.find({
      space: spaceId,
      archived: false,
      createdAt: { $gte: range.start, $lte: range.end },
    }).lean()) as any[]

    const taskMetrics = computeTaskMetrics(tasks, now)
    const timeInsights = computeTimeInsights(tasks, range)
    const teamMetrics = computeTeamMetrics({ members: space.members as any, tasks })

    // keep a similar top-level shape as the v2 mobile UI expects
    const analytics = {
      totalTasks: taskMetrics.totalTasks,
      completedTasks: taskMetrics.completedTasks,
      inProgressTasks: taskMetrics.inProgressTasks,
      overdueTasks: taskMetrics.overdueTasks,
      completionRate: taskMetrics.completionRate,
      averageCompletionTime: taskMetrics.averageCompletionTime,
      totalTimeSpent: 0,
      totalMembers: teamMetrics.totalMembers,
      activeMembers: teamMetrics.activeMembers,
      customerSatisfaction: taskMetrics.qualityMetrics.customerSatisfaction,
      taskMetrics: taskMetrics.taskMetrics,
      timeMetrics: taskMetrics.timeMetrics,
      teamMetrics,
      qualityMetrics: taskMetrics.qualityMetrics,
      // extra chart-friendly blocks (used by some dashboards)
      timeSeries: {
        dailyActivity: timeInsights.dailyActivity,
        weeklyTrends: timeInsights.weeklyTrends,
        peakHours: timeInsights.peakHours,
      },
    }

    void userId
    return { analytics, period: range.period }
  },

  async getWorkspaceAnalytics(workspaceId: string, userId: string, rangeInput: { period?: AnalyticsPeriod; startDate?: string; endDate?: string }) {
    const range = resolveRange(rangeInput)
    const now = new Date()

    const workspace = await Workspace.findById(workspaceId)
    if (!workspace || !workspace.isActive) throw new AppError('Workspace not found', 404)
    await populateWorkspaceMembers(workspace)

    const spaceIds = workspace.spaces ?? []
    if (spaceIds.length === 0) {
      return {
        analytics: {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          completionRate: 0,
          averageCompletionTime: 0,
          totalTimeSpent: 0,
          totalMembers: workspace.members?.length ?? 0,
          activeMembers: 0,
          customerSatisfaction: 0,
          taskMetrics: {
            totalTasks: 0,
            completedTasks: 0,
            inProgressTasks: 0,
            overdueTasks: 0,
            completionRate: 0,
            priorityDistribution: { low: 0, medium: 0, high: 0, urgent: 0 },
          },
          timeMetrics: {
            averageCompletionTime: 0,
            totalTimeSpent: 0,
            totalEstimated: 0,
            totalActual: 0,
            averageAccuracy: 0,
            totalOvertime: 0,
          },
          teamMetrics: { totalMembers: workspace.members?.length ?? 0, activeMembers: 0, topPerformers: [], workloadDistribution: [] },
          qualityMetrics: { customerSatisfaction: 0, bugRate: 0, reworkRate: 0, blockedTasks: 0, cycleTime: 0 },
          timeSeries: { dailyActivity: [], weeklyTrends: [], peakHours: [] },
        },
        period: range.period,
      }
    }

    const tasks = (await Task.find({
      space: { $in: spaceIds },
      archived: false,
      createdAt: { $gte: range.start, $lte: range.end },
    }).lean()) as any[]

    const taskMetrics = computeTaskMetrics(tasks, now)
    const timeInsights = computeTimeInsights(tasks, range)

    const teamMetrics = computeTeamMetrics({
      // workspace.members.user is populated, reuse shape
      members: workspace.members as any,
      tasks,
    })

    const analytics = {
      totalTasks: taskMetrics.totalTasks,
      completedTasks: taskMetrics.completedTasks,
      inProgressTasks: taskMetrics.inProgressTasks,
      overdueTasks: taskMetrics.overdueTasks,
      completionRate: taskMetrics.completionRate,
      averageCompletionTime: taskMetrics.averageCompletionTime,
      totalTimeSpent: 0,
      totalMembers: teamMetrics.totalMembers,
      activeMembers: teamMetrics.activeMembers,
      customerSatisfaction: taskMetrics.qualityMetrics.customerSatisfaction,
      taskMetrics: taskMetrics.taskMetrics,
      timeMetrics: taskMetrics.timeMetrics,
      teamMetrics,
      qualityMetrics: taskMetrics.qualityMetrics,
      timeSeries: {
        dailyActivity: timeInsights.dailyActivity,
        weeklyTrends: timeInsights.weeklyTrends,
        peakHours: timeInsights.peakHours,
      },
    }

    void userId
    return { analytics, period: range.period }
  },

  async getTeamPerformance(spaceId: string, userId: string, rangeInput: { period?: AnalyticsPeriod; startDate?: string; endDate?: string }) {
    const range = resolveRange(rangeInput)
    const now = new Date()
    void now

    const space = await Space.findById(spaceId)
    if (!space || !space.isActive) throw new AppError('Space not found', 404)
    await populateSpaceMembers(space)

    const tasks = (await Task.find({
      space: spaceId,
      archived: false,
      createdAt: { $gte: range.start, $lte: range.end },
    }).lean()) as any[]

    const teamMetrics = computeTeamMetrics({ members: space.members as any, tasks })

    const completedTasks = tasks.filter((t) => t.status === 'done' && !t.archived).length
    const totalWeeks = Math.max(1, Math.ceil((range.end.getTime() - range.start.getTime()) / (7 * 24 * 60 * 60 * 1000)))
    const teamVelocity = completedTasks / totalWeeks

    const collaborationScore =
      tasks.length > 0 ? (tasks.filter((t) => Array.isArray(t.assignees) && t.assignees.length > 1).length / tasks.length) * 100 : 0

    void userId
    return {
      analytics: {
        topPerformers: teamMetrics.topPerformers,
        workloadDistribution: teamMetrics.workloadDistribution,
        teamVelocity: Math.round(teamVelocity * 100) / 100,
        collaborationScore: Math.round(collaborationScore * 100) / 100,
      },
      period: range.period,
      spaceId,
    }
  },

  async generateSpaceAnalytics(spaceId: string, userId: string, options: { periodType?: AnalyticsPeriod; startDate?: string; endDate?: string; includeAI?: boolean }) {
    void userId
    void options
    const range = resolveRange({
      period: options.periodType,
      startDate: options.startDate,
      endDate: options.endDate,
    })
    const { analytics } = await this.getSpaceAnalytics(spaceId, userId, { period: range.period, startDate: range.start.toISOString(), endDate: range.end.toISOString() })
    return { analytics, period: range.period }
  },

  async exportSpaceAnalytics(
    spaceId: string,
    userId: string,
    options: { format: 'json' | 'csv'; period?: AnalyticsPeriod; startDate?: string; endDate?: string },
  ) {
    const { analytics, period } = await this.getSpaceAnalytics(spaceId, userId, {
      period: options.period,
      startDate: options.startDate,
      endDate: options.endDate,
    })

    if (options.format === 'json') {
      return { period, analytics }
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
      analytics.taskMetrics.priorityDistribution.low,
      analytics.taskMetrics.priorityDistribution.medium,
      analytics.taskMetrics.priorityDistribution.high,
      analytics.taskMetrics.priorityDistribution.urgent,
    ]

    const csv = [headers.join(','), row.join(',')].join('\n')
    return { period, analytics, csv }
  },

  async getUserAnalytics(userId: string, query: { range?: '1m' | '3m' | '6m' | '12m' }) {
    const rangeDays =
      query.range === '1m' ? 30 : query.range === '3m' ? 90 : query.range === '6m' ? 180 : query.range === '12m' ? 365 : 90
    const end = new Date()
    const start = new Date(end.getTime() - rangeDays * 24 * 60 * 60 * 1000)

    const tasksAssigned = (await Task.find({
      assignees: new Types.ObjectId(userId),
      archived: false,
      createdAt: { $gte: start, $lte: end },
    }).lean()) as any[]

    const tasksCompleted = tasksAssigned.filter((t) => t.status === 'done' && !t.archived).length
    const totalAssigned = tasksAssigned.length
    const completionRate = totalAssigned > 0 ? (tasksCompleted / totalAssigned) * 100 : 0

    const lastActiveTask = tasksAssigned
      .filter((t) => t.updatedAt)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

    // time series datasets for charts
    const dayGroups: Record<string, number> = {}
    for (const t of tasksAssigned) {
      if (!t.updatedAt) continue
      const key = toDayKeyUTC(new Date(t.updatedAt))
      dayGroups[key] = (dayGroups[key] ?? 0) + 1
    }

    const activitiesHeatmap = Object.entries(dayGroups)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, value]) => ({ date, value }))

    // contributions over time (created tasks where user is reporter or assignee)
    const contributedTasks = (await Task.find({
      archived: false,
      $or: [
        { reporter: new Types.ObjectId(userId) },
        { assignees: new Types.ObjectId(userId) },
        { watchers: new Types.ObjectId(userId) },
      ],
      createdAt: { $gte: start, $lte: end },
    }).lean()) as any[]

    const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const byMonth: Record<string, number> = {}
    for (const t of contributedTasks) {
      if (!t.createdAt) continue
      const key = monthKey(new Date(t.createdAt))
      byMonth[key] = (byMonth[key] ?? 0) + 1
    }
    const contributionsOverTime = Object.entries(byMonth)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, count]) => ({ period, count }))

    // recent tasks
    const recentTasks = tasksAssigned
      .slice()
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
      .slice(0, 5)
      .map((t) => ({ id: t._id.toString(), title: t.title, status: t.status, updatedAt: t.updatedAt }))

    const user = await User.findById(userId).select('name email avatar')
    const analytics = {
      totalProjects: 0,
      tasksAssigned: totalAssigned,
      tasksCompleted,
      completionRate: Math.round(completionRate * 100) / 100,
      lastActiveAt: lastActiveTask ? new Date(lastActiveTask.updatedAt).toISOString() : null,
      projectsOverTime: [],
      taskStatusBreakdown: {
        completed: tasksCompleted,
        inProgress: tasksAssigned.filter((t) => t.status === 'in_progress').length,
        pending: tasksAssigned.filter((t) => t.status === 'todo').length,
        overdue: tasksAssigned.filter((t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length,
      },
      activityHeatmap: activitiesHeatmap.map((x) => ({ date: x.date, value: x.value })),
      contributionsOverTime,
      recentProjects: [],
      recentTasks,
      collaborators: [],
      _userName: user?.name ?? undefined,
    }

    return { analytics, period: `${rangeDays}d` }
  },
}

