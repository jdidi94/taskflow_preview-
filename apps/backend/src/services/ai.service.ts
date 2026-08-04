import { Types } from 'mongoose'

import type { AiProvider } from '../models/Integration.js'
import { Board } from '../models/Board.js'
import { Space } from '../models/Space.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { analyticsService } from './analytics.service.js'
import { generateAiText } from '../ai/provider-resolver.js'

type RiskSeverity = 'low' | 'medium' | 'high'

function stripCodeFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

function tryParseJson<T>(text: string): T | null {
  try {
    return JSON.parse(stripCodeFence(text)) as T
  } catch {
    return null
  }
}

function cleanGoalTitle(goal: string) {
  return goal
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .slice(0, 80)
}

function normalizePriority(value: unknown): 'low' | 'medium' | 'high' | 'critical' {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') return value
  if (value === 'urgent') return 'critical'
  return 'medium'
}

function slugWords(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function parseDueDate(input: string): string | null {
  const lower = input.toLowerCase()
  const now = new Date()

  if (lower.includes('tomorrow')) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }
  if (lower.includes('next week')) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  const isoMatch = input.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (isoMatch) return new Date(`${isoMatch[1]}T09:00:00.000Z`).toISOString()

  return null
}

function fallbackSuggestions(goal: string, context?: string, boardType = 'kanban') {
  const goalStem = cleanGoalTitle(goal) || 'Goal'
  const suggestedColumn =
    boardType === 'kanban' ? 'To Do' : boardType === 'timeline' ? 'Planned' : boardType === 'calendar' ? 'Upcoming' : 'Backlog'

  return [
    {
      title: `Clarify scope for ${goalStem}`,
      description: `Define the success criteria, constraints, and delivery boundaries for ${goalStem}.${context ? ` Context: ${context}` : ''}`,
      priority: 'high',
      estimatedHours: 2,
      suggestedColumn,
      aiGenerated: false,
    },
    {
      title: `Break ${goalStem} into milestones`,
      description: 'Split the work into milestones so owners, dependencies, and deadlines are visible.',
      priority: 'high',
      estimatedHours: 3,
      suggestedColumn,
      aiGenerated: false,
    },
    {
      title: `Assign owners for ${goalStem}`,
      description: 'Identify who will own each part of the work and who needs to review or support it.',
      priority: 'medium',
      estimatedHours: 1,
      suggestedColumn,
      aiGenerated: false,
    },
    {
      title: `Set timeline checkpoints`,
      description: 'Create checkpoints for progress reviews, delivery dates, and possible risk escalation.',
      priority: 'medium',
      estimatedHours: 2,
      suggestedColumn,
      aiGenerated: false,
    },
    {
      title: `Review blockers and dependencies`,
      description: 'Capture blockers, cross-team dependencies, and any approvals needed before execution begins.',
      priority: 'medium',
      estimatedHours: 2,
      suggestedColumn,
      aiGenerated: false,
    },
  ]
}

function calculateRiskScore(risks: Array<{ severity: RiskSeverity }>) {
  const weights: Record<RiskSeverity, number> = { low: 1, medium: 3, high: 5 }
  return risks.reduce((score, risk) => score + weights[risk.severity], 0)
}

function buildHeuristicRecommendations(tasks: any[], userId: string) {
  const currentTasks = tasks.filter(
    (task) =>
      Array.isArray(task.assignees) &&
      task.assignees.some((assignee: any) => String(assignee) === userId) &&
      task.status !== 'done' &&
      !task.archived,
  )

  const overdue = currentTasks.filter((task) => task.dueDate && new Date(task.dueDate).getTime() < Date.now())
  const highPriority = currentTasks.filter((task) => task.priority === 'critical' || task.priority === 'high')
  const unassignedSpaceTasks = tasks.filter(
    (task) => (!Array.isArray(task.assignees) || task.assignees.length === 0) && task.status !== 'done' && !task.archived,
  )

  return {
    next_tasks: [
      ...(overdue.length
        ? [
            {
              type: 'overdue_focus',
              title: 'Resolve overdue assignments first',
              message: `${overdue.length} of your tasks are overdue and should be triaged before new work is started.`,
            },
          ]
        : []),
      ...(highPriority.length
        ? [
            {
              type: 'high_priority_queue',
              title: 'Prioritize critical and high-priority tasks',
              message: `${highPriority.length} active task(s) are high priority or critical.`,
            },
          ]
        : []),
    ],
    optimization: [
      ...(unassignedSpaceTasks.length
        ? [
            {
              type: 'assignment_gap',
              title: 'Assign unowned work',
              message: `${unassignedSpaceTasks.length} open task(s) in this space have no assignees.`,
            },
          ]
        : []),
      {
        type: 'review_rhythm',
        title: 'Schedule a weekly delivery review',
        message: 'A regular review cadence helps catch blocked or drifting work before deadlines slip.',
      },
    ],
  }
}

function fallbackDescription(title: string, context?: string, taskType?: string) {
  return [
    `Complete the task: ${title}.`,
    context ? `Context: ${context}.` : null,
    taskType ? `Task type: ${taskType}.` : null,
    'Acceptance criteria:',
    '- The deliverable is clearly defined and complete.',
    '- Any dependencies, blockers, or approvals are documented.',
    '- The outcome is ready for review by the team.',
  ]
    .filter(Boolean)
    .join('\n')
}

function parsePeriod(period?: '7d' | '14d' | '30d' | '90d') {
  switch (period) {
    case '7d':
      return { period: 'week' as const }
    case '14d':
      return {
        startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      }
    case '90d':
      return { period: 'quarter' as const }
    case '30d':
    default:
      return { period: 'month' as const }
  }
}

async function ensureSpaceExists(spaceId: string) {
  const space = await Space.findById(spaceId)
  if (!space || !space.isActive) throw new AppError('Space not found', 404)
  return space
}

async function ensureBoardExists(boardId: string) {
  const board = await Board.findById(boardId)
  if (!board || !board.isActive) throw new AppError('Board not found', 404)
  return board
}

async function requestAiJson<T>(prompt: string, systemPrompt: string, preferredProvider?: AiProvider) {
  const result = await generateAiText({
    prompt,
    systemPrompt,
    preferredProvider,
    json: true,
  })

  if (!result) return null
  return {
    parsed: tryParseJson<T>(result.text),
    meta: { provider: result.provider, source: result.source, model: result.model },
  }
}

export const aiService = {
  async generateTaskSuggestions(args: {
    goal: string
    context?: string
    boardType?: 'kanban' | 'list' | 'calendar' | 'timeline'
  }) {
    const fallback = fallbackSuggestions(args.goal, args.context, args.boardType)
    const aiResult = await requestAiJson<Array<Record<string, unknown>>>(
      [
        `Space Goal: ${args.goal}`,
        `Context: ${args.context ?? 'General workspace planning'}`,
        `Board Type: ${args.boardType ?? 'kanban'}`,
        'Return a JSON array of 5 to 8 actionable task suggestions.',
        'Each object must include: title, description, priority, estimatedHours, suggestedColumn.',
      ].join('\n'),
      'You generate concise project-management tasks and return strict JSON.',
    ).catch(() => null)

    const suggestions = Array.isArray(aiResult?.parsed) ? aiResult.parsed : fallback

    return suggestions.map((task: any, index: number) => ({
      title: typeof task.title === 'string' && task.title.trim() ? task.title.trim().slice(0, 200) : fallback[index % fallback.length].title,
      description:
        typeof task.description === 'string' && task.description.trim()
          ? task.description.trim().slice(0, 1000)
          : fallback[index % fallback.length].description,
      priority: normalizePriority(task.priority),
      estimatedHours:
        typeof task.estimatedHours === 'number' && Number.isFinite(task.estimatedHours)
          ? Math.max(1, Math.min(168, Math.round(task.estimatedHours)))
          : fallback[index % fallback.length].estimatedHours,
      suggestedColumn:
        typeof task.suggestedColumn === 'string' && task.suggestedColumn.trim()
          ? task.suggestedColumn.trim().slice(0, 100)
          : fallback[index % fallback.length].suggestedColumn,
      aiGenerated: Boolean(aiResult?.parsed),
    }))
  },

  async analyzeTaskRisks(args: { spaceId?: string; boardId?: string; userId: string }) {
    const filter: Record<string, unknown> = { archived: false }
    let scope: { type: 'space' | 'board'; id: string; name?: string | null }

    if (args.boardId) {
      const board = await ensureBoardExists(args.boardId)
      filter.board = board._id
      scope = { type: 'board', id: board._id.toString(), name: board.name }
    } else if (args.spaceId) {
      const space = await ensureSpaceExists(args.spaceId)
      filter.space = space._id
      scope = { type: 'space', id: space._id.toString(), name: space.name }
    } else {
      throw new AppError('spaceId or boardId is required', 400)
    }

    const tasks = (await Task.find(filter).populate('assignees', 'name email').lean()) as any[]
    const now = new Date()
    const risks: Array<Record<string, unknown> & { severity: RiskSeverity }> = []
    const recommendations: Array<Record<string, unknown>> = []

    const overdueTasks = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < now && task.status !== 'done')
    if (overdueTasks.length) {
      risks.push({
        type: 'overdue_tasks',
        severity: 'high',
        message: `${overdueTasks.length} task(s) are overdue`,
        tasks: overdueTasks.map((task) => task._id),
        recommendation: 'Re-prioritize or complete overdue tasks immediately.',
      })
    }

    const unassignedDueSoon = tasks.filter((task) => {
      if (!task.dueDate || task.status === 'done') return false
      const due = new Date(task.dueDate).getTime()
      return due >= now.getTime() && due <= now.getTime() + 3 * 24 * 60 * 60 * 1000 && (!task.assignees || task.assignees.length === 0)
    })
    if (unassignedDueSoon.length) {
      risks.push({
        type: 'unassigned_due_soon',
        severity: 'medium',
        message: `${unassignedDueSoon.length} task(s) are due soon without assignees`,
        tasks: unassignedDueSoon.map((task) => task._id),
        recommendation: 'Assign owners before due dates slip.',
      })
    }

    const blockedTasks = tasks.filter((task) =>
      Array.isArray(task.dependencies) &&
      task.dependencies.some((dep: any) => dep?.type === 'blocked_by' || dep?.type === 'blocks'),
    )
    if (blockedTasks.length) {
      risks.push({
        type: 'dependency_pressure',
        severity: blockedTasks.length >= 5 ? 'high' : 'low',
        message: `${blockedTasks.length} task(s) have explicit dependency relationships that may impact delivery.`,
        tasks: blockedTasks.map((task) => task._id),
        recommendation: 'Review dependency chains and unblock critical tasks early.',
      })
    }

    const workloadMap = new Map<string, { name: string; tasks: number }>()
    for (const task of tasks) {
      for (const assignee of task.assignees ?? []) {
        const key = String(assignee._id ?? assignee)
        const name = assignee.name ?? 'Unknown'
        const current = workloadMap.get(key) ?? { name, tasks: 0 }
        if (task.status !== 'done') current.tasks += 1
        workloadMap.set(key, current)
      }
    }

    const workloadEntries = [...workloadMap.values()]
    if (workloadEntries.length > 1) {
      const average = workloadEntries.reduce((sum, entry) => sum + entry.tasks, 0) / workloadEntries.length
      const overloaded = workloadEntries.filter((entry) => entry.tasks > average * 1.5 && entry.tasks >= 3)
      if (overloaded.length) {
        risks.push({
          type: 'workload_imbalance',
          severity: 'medium',
          message: `${overloaded.length} team member(s) appear overloaded.`,
          data: overloaded,
          recommendation: 'Rebalance assignments across the team.',
        })
      }
    }

    const aiAnalysis = tasks.length >= 4
      ? await requestAiJson<{
          risks?: Array<{ type?: string; severity?: RiskSeverity; message?: string; recommendation?: string }>
          recommendations?: Array<{ title?: string; message?: string }>
        }>(
          [
            `Scope: ${scope.type} ${scope.name ?? scope.id}`,
            'Analyze this task set for schedule, resource, and delivery risks.',
            JSON.stringify(
              tasks.map((task) => ({
                title: task.title,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                assignees: Array.isArray(task.assignees) ? task.assignees.length : 0,
                dependencies: task.dependencies?.length ?? 0,
              })),
              null,
              2,
            ),
          ].join('\n'),
          'Return strict JSON with arrays `risks` and `recommendations`.',
        ).catch(() => null)
      : null

    if (aiAnalysis?.parsed?.risks) {
      for (const risk of aiAnalysis.parsed.risks) {
        if (!risk?.message) continue
        risks.push({
          type: risk.type ?? 'ai_insight',
          severity: normalizePriority(risk.severity) === 'critical' ? 'high' : (risk.severity ?? 'medium'),
          message: risk.message,
          recommendation: risk.recommendation ?? 'Review this risk with the team.',
        })
      }
    }

    if (aiAnalysis?.parsed?.recommendations) {
      recommendations.push(
        ...aiAnalysis.parsed.recommendations
          .filter((entry) => entry?.message)
          .map((entry) => ({
            title: entry.title ?? 'AI recommendation',
            message: entry.message,
          })),
      )
    }

    return {
      risks,
      recommendations,
      summary: {
        totalTasks: tasks.length,
        overdueTasks: overdueTasks.length,
        completedTasks: tasks.filter((task) => task.status === 'done').length,
        riskScore: calculateRiskScore(risks),
      },
      scope,
    }
  },

  async parseNaturalLanguageTask(args: { input: string; boardId?: string; userId: string }) {
    if (args.boardId) await ensureBoardExists(args.boardId)
    const fallback = {
      title: args.input.slice(0, 100),
      description: args.input.length > 100 ? args.input.slice(100).trim() : null,
      priority: args.input.toLowerCase().includes('urgent')
        ? 'critical'
        : args.input.toLowerCase().includes('high')
          ? 'high'
          : args.input.toLowerCase().includes('low')
            ? 'low'
            : 'medium',
      dueDate: parseDueDate(args.input),
      labels: slugWords(args.input)
        .filter((word) => word.startsWith('#'))
        .map((word) => word.slice(1)),
      suggestedAssignees: Array.from(args.input.matchAll(/@([a-zA-Z0-9._-]+)/g)).map((match) => match[1]),
      originalInput: args.input,
    }

    const aiResult = await requestAiJson<Record<string, unknown>>(
      [
        `Input: ${args.input}`,
        `Board ID: ${args.boardId ?? 'not provided'}`,
        'Extract title, description, priority, dueDate, labels, and suggestedAssignees as strict JSON.',
      ].join('\n'),
      'You convert natural-language task requests into structured task metadata and return strict JSON.',
    ).catch(() => null)

    const parsed = aiResult?.parsed ?? {}
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim().slice(0, 200) : fallback.title,
      description:
        typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim().slice(0, 2000) : fallback.description,
      priority: normalizePriority(parsed.priority ?? fallback.priority),
      dueDate:
        typeof parsed.dueDate === 'string' && parsed.dueDate.trim()
          ? new Date(parsed.dueDate).toISOString()
          : fallback.dueDate,
      labels: Array.isArray(parsed.labels) ? parsed.labels.filter((item) => typeof item === 'string').slice(0, 10) : fallback.labels,
      suggestedAssignees: Array.isArray(parsed.suggestedAssignees)
        ? parsed.suggestedAssignees.filter((item) => typeof item === 'string').slice(0, 10)
        : fallback.suggestedAssignees,
      originalInput: args.input,
      aiGenerated: Boolean(aiResult?.parsed),
    }
  },

  async generateSpaceTimeline(args: {
    spaceId: string
    startDate: Date
    targetEndDate: Date | null
    priorities: Array<'low' | 'medium' | 'high' | 'critical'>
  }) {
    const space = await ensureSpaceExists(args.spaceId)
    const tasks = (await Task.find({ space: args.spaceId, archived: false }).lean()) as any[]
    if (!tasks.length) {
      return { message: 'No tasks found for timeline generation', phases: [], milestones: [], criticalPath: [] }
    }

    const filtered = args.priorities.length ? tasks.filter((task) => args.priorities.includes(task.priority)) : tasks
    const ordered = filtered.sort((a, b) => {
      const rank = { critical: 4, high: 3, medium: 2, low: 1 }
      return rank[b.priority as keyof typeof rank] - rank[a.priority as keyof typeof rank]
    })

    const phaseTasks = ordered.slice(0, 12).map((task, index) => {
      const start = new Date(args.startDate.getTime() + index * 2 * 24 * 60 * 60 * 1000)
      const end = new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000)
      return {
        taskId: task._id,
        title: task.title,
        priority: task.priority,
        suggestedStart: start.toISOString(),
        suggestedEnd: end.toISOString(),
      }
    })

    const milestones = phaseTasks.slice(0, 4).map((task, index) => ({
      title: `Milestone ${index + 1}`,
      targetDate: task.suggestedEnd,
      relatedTasks: [task.taskId],
    }))

    const aiResult = await requestAiJson<{
      milestones?: Array<{ title?: string; targetDate?: string; notes?: string }>
      criticalPath?: string[]
      recommendations?: string[]
    }>(
      [
        `Space: ${space.name}`,
        `Start date: ${args.startDate.toISOString()}`,
        `Target end date: ${args.targetEndDate?.toISOString() ?? 'not provided'}`,
        'Create a concise timeline plan from these tasks:',
        JSON.stringify(
          ordered.slice(0, 12).map((task) => ({
            title: task.title,
            priority: task.priority,
            status: task.status,
            dueDate: task.dueDate,
            dependencies: task.dependencies?.length ?? 0,
          })),
          null,
          2,
        ),
      ].join('\n'),
      'Return strict JSON with optional milestones, criticalPath, and recommendations.',
    ).catch(() => null)

    return {
      generatedAt: new Date().toISOString(),
      parameters: {
        startDate: args.startDate.toISOString(),
        targetEndDate: args.targetEndDate?.toISOString() ?? null,
        priorities: args.priorities,
      },
      phases: phaseTasks,
      milestones:
        aiResult?.parsed?.milestones?.length
          ? aiResult.parsed.milestones.map((milestone) => ({
              title: milestone.title ?? 'Milestone',
              targetDate: milestone.targetDate ?? null,
              notes: milestone.notes ?? null,
            }))
          : milestones,
      criticalPath: aiResult?.parsed?.criticalPath ?? phaseTasks.slice(0, 3).map((task) => task.title),
      recommendations: aiResult?.parsed?.recommendations ?? [
        'Focus first on critical and blocked tasks.',
        'Review the timeline weekly and rebalance owners when work starts to cluster.',
      ],
    }
  },

  async getSmartRecommendations(args: { userId: string; spaceId: string; type?: 'all' | 'next_tasks' | 'optimization' }) {
    await ensureSpaceExists(args.spaceId)
    const tasks = (await Task.find({ space: args.spaceId, archived: false }).lean()) as any[]
    const heuristic = buildHeuristicRecommendations(tasks, args.userId)

    const response = {
      next_tasks: heuristic.next_tasks,
      optimization: heuristic.optimization,
    }

    if (args.type === 'next_tasks') return response.next_tasks
    if (args.type === 'optimization') return response.optimization
    return response
  },

  async analyzeTeamPerformance(args: { spaceId: string; period?: '7d' | '14d' | '30d' | '90d'; userId: string }) {
    await ensureSpaceExists(args.spaceId)
    const analytics = await analyticsService.getTeamPerformance(args.spaceId, args.userId, parsePeriod(args.period))
    const topPerformers = analytics.analytics.topPerformers ?? []
    const workloadDistribution = analytics.analytics.workloadDistribution ?? []

    const aiSummary = await generateAiText({
      prompt: [
        'Summarize team delivery performance and suggest one improvement.',
        JSON.stringify({ topPerformers, workloadDistribution }, null, 2),
      ].join('\n'),
      systemPrompt: 'Provide a short plain-text summary for a project manager.',
    }).catch(() => null)

    return {
      ...analytics,
      summary:
        aiSummary?.text?.trim() ??
        'Team performance summary is based on completed work, collaboration score, and workload distribution.',
    }
  },

  async generateTaskDescription(args: { title: string; context?: string; taskType?: string }) {
    const aiResult = await generateAiText({
      prompt: [
        `Task title: ${args.title}`,
        `Space context: ${args.context ?? 'General task context'}`,
        `Task type: ${args.taskType ?? 'General task'}`,
        'Write a concise task description followed by three acceptance criteria bullets.',
      ].join('\n'),
      systemPrompt: 'Write practical task descriptions for a project management tool.',
    }).catch(() => null)

    return aiResult?.text?.trim() || fallbackDescription(args.title, args.context, args.taskType)
  },

  async getAvailableAssignees(boardId?: string) {
    if (!boardId) return []
    const board = await Board.findById(boardId)
    if (!board) return []

    const userIds = new Set<string>()
    if (board.owner) userIds.add(String(board.owner))
    for (const member of board.members ?? []) userIds.add(String(member.user))

    const users = await User.find({ _id: { $in: [...userIds].map((id) => new Types.ObjectId(id)) } })
      .select('name email')
      .lean()

    return users.map((user) => ({ id: user._id.toString(), name: user.name, email: user.email }))
  },
}

