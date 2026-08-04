import { Types } from 'mongoose'

import { generateAiText } from '../ai/provider-resolver.js'
import { env } from '../config/env.js'
import { Board } from '../models/Board.js'
import { Column } from '../models/Column.js'
import { Task } from '../models/Task.js'
import type { PlaceContextPack } from './aiContext.service.js'
import type { ProposedAgentTool } from './aiAgentTools.service.js'
import { AppError } from '../utils/AppError.js'

type BoardType = 'kanban' | 'list' | 'calendar' | 'timeline'
type Priority = 'low' | 'medium' | 'high' | 'critical'

type BoardGenerationOptions = {
  maxTokens?: number
  includeChecklists?: boolean
  includeTags?: boolean
  moderateContent?: boolean
}

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

function normalizePriority(value: unknown): Priority {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') return value
  if (value === 'urgent') return 'critical'
  return 'medium'
}

function cleanTitle(input: string) {
  return input.trim().replace(/\s+/g, ' ').slice(0, 120) || 'New board'
}

async function requestAiJson<T>(prompt: string, systemPrompt: string) {
  const result = await generateAiText({
    prompt,
    systemPrompt,
    json: true,
  })
  if (!result?.text) return null
  return tryParseJson<T>(result.text)
}

function fallbackBoardData(prompt: string, options: BoardGenerationOptions) {
  const name = cleanTitle(prompt)
  const columns = [
    {
      name: 'To Do',
      position: 0,
      color: '#64748b',
      backgroundColor: '#f8fafc',
      limit: null as number | null,
      settings: {
        wipLimit: { enabled: false, limit: null, strictMode: false },
        sorting: { method: 'manual' as const, direction: 'asc' as const, autoSort: false },
      },
      style: { color: '#64748b', backgroundColor: '#f8fafc', icon: null },
    },
    {
      name: 'In Progress',
      position: 1,
      color: '#2563eb',
      backgroundColor: '#eff6ff',
      limit: null as number | null,
      settings: {
        wipLimit: { enabled: false, limit: null, strictMode: false },
        sorting: { method: 'manual' as const, direction: 'asc' as const, autoSort: false },
      },
      style: { color: '#2563eb', backgroundColor: '#eff6ff', icon: null },
    },
    {
      name: 'Done',
      position: 2,
      color: '#16a34a',
      backgroundColor: '#f0fdf4',
      limit: null as number | null,
      settings: {
        wipLimit: { enabled: false, limit: null, strictMode: false },
        sorting: { method: 'manual' as const, direction: 'asc' as const, autoSort: false },
      },
      style: { color: '#16a34a', backgroundColor: '#f0fdf4', icon: null },
    },
  ]

  const tasks = [
    {
      title: `Clarify goals for ${name}`,
      description: `Define success criteria and scope based on: ${prompt}`,
      priority: 'high' as Priority,
      color: '#f59e0b',
      assignees: [] as string[],
      tags: options.includeTags === false ? [] : ['planning'],
      dueDate: null as string | null,
      estimatedHours: 2,
      position: 0,
      column: 'To Do',
    },
    {
      title: `Break work into milestones`,
      description: 'Identify milestones, owners, and dependencies for delivery.',
      priority: 'high' as Priority,
      color: '#3b82f6',
      assignees: [] as string[],
      tags: options.includeTags === false ? [] : ['planning'],
      dueDate: null as string | null,
      estimatedHours: 3,
      position: 1,
      column: 'To Do',
    },
    {
      title: `Start first delivery slice`,
      description: 'Execute the first concrete unit of work for this board.',
      priority: 'medium' as Priority,
      color: '#8b5cf6',
      assignees: [] as string[],
      tags: options.includeTags === false ? [] : ['execution'],
      dueDate: null as string | null,
      estimatedHours: 4,
      position: 0,
      column: 'In Progress',
    },
  ]

  return {
    board: {
      name,
      description: `AI-generated board from prompt: ${prompt.slice(0, 280)}`,
      type: 'kanban' as BoardType,
      visibility: 'workspace' as const,
      settings: {
        allowComments: true,
        allowAttachments: true,
        allowTimeTracking: true,
        defaultTaskPriority: 'medium' as Priority,
        autoArchive: false,
        archiveAfterDays: 30,
      },
    },
    columns,
    tasks,
    tags:
      options.includeTags === false
        ? []
        : [
            {
              name: 'planning',
              color: '#2563eb',
              textColor: '#ffffff',
              category: 'type' as const,
              description: 'Planning work',
              scope: 'board' as const,
            },
            {
              name: 'execution',
              color: '#16a34a',
              textColor: '#ffffff',
              category: 'status' as const,
              description: 'Execution work',
              scope: 'board' as const,
            },
          ],
    checklists:
      options.includeChecklists === false
        ? []
        : [
            {
              title: 'Kickoff checklist',
              items: [
                { text: 'Confirm goals and owners', priority: 'high' as Priority, position: 0, estimatedMinutes: 30 },
                { text: 'Define first milestone', priority: 'medium' as Priority, position: 1, estimatedMinutes: 45 },
                { text: 'Schedule review cadence', priority: 'low' as Priority, position: 2, estimatedMinutes: 20 },
              ],
            },
          ],
    metadata: {
      generatedAt: new Date().toISOString(),
      pipelineVersion: '3.0.0',
      fallback: true,
      errors: [] as string[],
      warnings: [] as string[],
    },
  }
}

function normalizeBoardGeneration(raw: any, prompt: string, options: BoardGenerationOptions) {
  const fallback = fallbackBoardData(prompt, options)
  const board = raw?.board ?? {}
  const columns = Array.isArray(raw?.columns) && raw.columns.length ? raw.columns : fallback.columns
  const tasks = Array.isArray(raw?.tasks) && raw.tasks.length ? raw.tasks : fallback.tasks

  return {
    board: {
      name: typeof board.name === 'string' && board.name.trim() ? board.name.trim().slice(0, 120) : fallback.board.name,
      description:
        typeof board.description === 'string' && board.description.trim()
          ? board.description.trim().slice(0, 1000)
          : fallback.board.description,
      type:
        board.type === 'kanban' || board.type === 'list' || board.type === 'calendar' || board.type === 'timeline'
          ? board.type
          : fallback.board.type,
      visibility:
        board.visibility === 'private' || board.visibility === 'workspace' || board.visibility === 'public'
          ? board.visibility
          : fallback.board.visibility,
      settings: {
        ...fallback.board.settings,
        ...(board.settings && typeof board.settings === 'object' ? board.settings : {}),
      },
    },
    columns: columns.map((column: any, index: number) => ({
      ...fallback.columns[Math.min(index, fallback.columns.length - 1)],
      name: typeof column.name === 'string' && column.name.trim() ? column.name.trim().slice(0, 80) : `Column ${index + 1}`,
      position: typeof column.position === 'number' ? column.position : index,
      color: typeof column.color === 'string' ? column.color : fallback.columns[index % fallback.columns.length].color,
      backgroundColor:
        typeof column.backgroundColor === 'string'
          ? column.backgroundColor
          : fallback.columns[index % fallback.columns.length].backgroundColor,
      limit: typeof column.limit === 'number' ? column.limit : null,
    })),
    tasks: tasks.map((task: any, index: number) => ({
      title:
        typeof task.title === 'string' && task.title.trim()
          ? task.title.trim().slice(0, 200)
          : fallback.tasks[index % fallback.tasks.length].title,
      description:
        typeof task.description === 'string' && task.description.trim()
          ? task.description.trim().slice(0, 1000)
          : fallback.tasks[index % fallback.tasks.length].description,
      priority: normalizePriority(task.priority),
      color: typeof task.color === 'string' ? task.color : '#64748b',
      assignees: Array.isArray(task.assignees) ? task.assignees.map(String) : [],
      tags: Array.isArray(task.tags) ? task.tags.map(String) : [],
      dueDate: typeof task.dueDate === 'string' ? task.dueDate : null,
      estimatedHours:
        typeof task.estimatedHours === 'number' && Number.isFinite(task.estimatedHours)
          ? Math.max(1, Math.min(168, Math.round(task.estimatedHours)))
          : 2,
      position: typeof task.position === 'number' ? task.position : index,
      column:
        typeof task.column === 'string' && task.column.trim()
          ? task.column.trim()
          : fallback.columns[0].name,
    })),
    tags: options.includeTags === false ? [] : Array.isArray(raw?.tags) && raw.tags.length ? raw.tags : fallback.tags,
    checklists:
      options.includeChecklists === false
        ? []
        : Array.isArray(raw?.checklists) && raw.checklists.length
          ? raw.checklists
          : fallback.checklists,
    metadata: {
      generatedAt: new Date().toISOString(),
      pipelineVersion: '3.0.0',
      fallback: !raw,
      errors: [] as string[],
      warnings: [] as string[],
    },
  }
}

export const aiRealtimeService = {
  getModelInfo() {
    return {
      models: {
        default: env.DEFAULT_AI_PROVIDER,
        openai: env.OPENAI_MODEL,
        google: env.GOOGLE_GEMINI_MODEL,
        anthropic: env.ANTHROPIC_MODEL,
        azure: env.AZURE_OPENAI_DEPLOYMENT,
      },
      features: [
        'board_generation',
        'assistant_chat',
        'content_moderation',
        'auto_completion',
        'smart_suggestions',
        'quick_templates',
        'improvement_suggestions',
        'additional_tasks',
      ],
      available: true,
      provider: env.DEFAULT_AI_PROVIDER,
    }
  },

  async generateBoard(prompt: string, options: BoardGenerationOptions = {}) {
    const fallback = fallbackBoardData(prompt, options)
    try {
      const parsed = await requestAiJson<Record<string, unknown>>(
        [
          `User prompt: ${prompt}`,
          'Generate a complete board blueprint as JSON with keys: board, columns, tasks, tags, checklists.',
          'board must include name, description, type (kanban|list|calendar|timeline), visibility, settings.',
          'columns: array with name, position, color, backgroundColor.',
          'tasks: array with title, description, priority, column, estimatedHours.',
          options.includeTags === false ? 'Omit tags.' : 'Include a few useful tags.',
          options.includeChecklists === false ? 'Omit checklists.' : 'Include one kickoff checklist.',
        ].join('\n'),
        'You generate project boards for a task manager. Return strict JSON only.',
      )
      return {
        success: true as const,
        data: normalizeBoardGeneration(parsed, prompt, options),
        errors: [] as string[],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Board generation failed'
      return {
        success: true as const,
        data: { ...fallback, metadata: { ...fallback.metadata, errors: [message], fallback: true } },
        errors: [message],
      }
    }
  },

  async autoCompletePrompt(partialPrompt: string, context: Record<string, unknown> = {}) {
    const fallback = {
      suggestions: [
        {
          prompt: `${partialPrompt} with clear milestones and owners`,
          description: 'Adds structure around milestones and ownership',
          complexity: 'medium' as const,
          estimatedTasks: 8,
          estimatedColumns: 3,
        },
        {
          prompt: `${partialPrompt} for a small cross-functional team`,
          description: 'Tailors the board for a compact delivery team',
          complexity: 'simple' as const,
          estimatedTasks: 5,
          estimatedColumns: 3,
        },
        {
          prompt: `${partialPrompt} including risks, dependencies, and review cadence`,
          description: 'Emphasizes risk tracking and delivery reviews',
          complexity: 'complex' as const,
          estimatedTasks: 12,
          estimatedColumns: 4,
        },
      ],
      keywords: partialPrompt.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6),
      categories: [typeof context.category === 'string' ? context.category : 'general', 'planning', 'delivery'],
    }

    try {
      const parsed = await requestAiJson<typeof fallback>(
        [
          `Partial prompt: ${partialPrompt}`,
          `Context: ${JSON.stringify(context)}`,
          'Return JSON with suggestions (array of {prompt, description, complexity, estimatedTasks, estimatedColumns}), keywords, categories.',
        ].join('\n'),
        'You help users complete board-generation prompts. Return strict JSON.',
      )
      if (!parsed?.suggestions?.length) return fallback
      return {
        suggestions: parsed.suggestions.slice(0, 3).map((item, index) => ({
          prompt: typeof item.prompt === 'string' ? item.prompt : fallback.suggestions[index].prompt,
          description: typeof item.description === 'string' ? item.description : fallback.suggestions[index].description,
          complexity:
            item.complexity === 'simple' || item.complexity === 'medium' || item.complexity === 'complex'
              ? item.complexity
              : fallback.suggestions[index].complexity,
          estimatedTasks:
            typeof item.estimatedTasks === 'number' ? item.estimatedTasks : fallback.suggestions[index].estimatedTasks,
          estimatedColumns:
            typeof item.estimatedColumns === 'number'
              ? item.estimatedColumns
              : fallback.suggestions[index].estimatedColumns,
        })),
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String).slice(0, 8) : fallback.keywords,
        categories: Array.isArray(parsed.categories) ? parsed.categories.map(String).slice(0, 5) : fallback.categories,
      }
    } catch {
      return fallback
    }
  },

  async getSmartSuggestions(input: string, type = 'board') {
    const fallback = {
      boardTypes: [
        { type: 'kanban' as const, name: 'Kanban', description: 'Flow work across stages', icon: 'columns' },
        { type: 'list' as const, name: 'List', description: 'Simple prioritized backlog', icon: 'list' },
        { type: 'timeline' as const, name: 'Timeline', description: 'Sequence work over time', icon: 'calendar' },
      ],
      templates: [
        { name: `${cleanTitle(input)} Kickoff`, description: `Starter board for ${input}`, category: type },
        { name: 'Delivery Tracker', description: 'Track execution and reviews', category: 'delivery' },
      ],
      suggestions: [
        `Create a ${type} for ${input}`,
        `Break ${input} into weekly milestones`,
        `Add risk and dependency tracking for ${input}`,
      ],
      categories: [type, 'planning', 'delivery'],
    }

    try {
      const parsed = await requestAiJson<typeof fallback>(
        [
          `Input: ${input}`,
          `Type: ${type}`,
          'Return JSON with boardTypes, templates, suggestions, categories.',
        ].join('\n'),
        'You generate smart board suggestions. Return strict JSON.',
      )
      if (!parsed) return fallback
      return {
        boardTypes: Array.isArray(parsed.boardTypes) && parsed.boardTypes.length ? parsed.boardTypes : fallback.boardTypes,
        templates: Array.isArray(parsed.templates) && parsed.templates.length ? parsed.templates : fallback.templates,
        suggestions: Array.isArray(parsed.suggestions) && parsed.suggestions.length ? parsed.suggestions : fallback.suggestions,
        categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : fallback.categories,
      }
    } catch {
      return fallback
    }
  },

  async generateQuickTemplates(category = 'general', count = 5) {
    const safeCount = Math.max(1, Math.min(5, count))
    const fallback = Array.from({ length: safeCount }, (_, index) => ({
      name: `${category[0]?.toUpperCase() ?? 'G'}${category.slice(1)} Template ${index + 1}`,
      description: `Quick ${category} board template for team planning and delivery.`,
      category,
    }))

    try {
      const parsed = await requestAiJson<Array<{ name?: string; description?: string }>>(
        `Generate ${safeCount} quick board templates for category "${category}". Return JSON array of {name, description}.`,
        'You generate concise board templates. Return strict JSON array.',
      )
      if (!Array.isArray(parsed) || !parsed.length) return fallback
      return parsed.slice(0, safeCount).map((item, index) => ({
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : fallback[index].name,
        description:
          typeof item.description === 'string' && item.description.trim()
            ? item.description.trim()
            : fallback[index].description,
        category,
      }))
    } catch {
      return fallback
    }
  },

  async generateAdditionalTasks(boardId: string, columnName: string, count = 3) {
    if (!Types.ObjectId.isValid(boardId)) throw new AppError('Invalid board id', 400)
    const board = await Board.findById(boardId)
    if (!board || !board.isActive) throw new AppError('Board not found', 404)

    const columns = await Column.find({ board: boardId, isActive: true }).sort({ position: 1 }).lean()
    const safeCount = Math.max(1, Math.min(5, count))
    const fallback = Array.from({ length: safeCount }, (_, index) => ({
      title: `${columnName}: next action ${index + 1} for ${board.name}`,
      priority: (index === 0 ? 'high' : 'medium') as Priority,
      description: `Suggested follow-up work in ${columnName}.`,
    }))

    try {
      const parsed = await requestAiJson<Array<{ title?: string; priority?: string; description?: string }>>(
        [
          `Board: ${board.name}`,
          `Columns: ${columns.map((column) => column.name).join(', ')}`,
          `Generate ${safeCount} tasks for column "${columnName}".`,
          'Return JSON array of {title, priority, description}.',
        ].join('\n'),
        'You generate concise follow-up tasks. Return strict JSON array.',
      )
      if (!Array.isArray(parsed) || !parsed.length) return fallback
      return parsed.slice(0, safeCount).map((item, index) => ({
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : fallback[index].title,
        priority: normalizePriority(item.priority),
        description:
          typeof item.description === 'string' && item.description.trim()
            ? item.description.trim()
            : fallback[index].description,
      }))
    } catch {
      return fallback
    }
  },

  async suggestImprovements(boardId: string) {
    if (!Types.ObjectId.isValid(boardId)) throw new AppError('Invalid board id', 400)
    const board = await Board.findById(boardId)
    if (!board || !board.isActive) throw new AppError('Board not found', 404)

    const [columns, tasks] = await Promise.all([
      Column.find({ board: boardId, isActive: true }).sort({ position: 1 }).lean(),
      Task.find({ board: boardId, archived: false }).lean(),
    ])

    const fallback = {
      structure: [
        {
          title: 'Balance column workload',
          message: `Review task distribution across ${columns.length} columns to reduce bottlenecks.`,
        },
      ],
      process: [
        {
          title: 'Add a review cadence',
          message: 'Schedule a recurring board review to clear blocked and overdue work.',
        },
      ],
      content: [
        {
          title: 'Clarify unfinished tasks',
          message: `${tasks.filter((task) => task.status !== 'done').length} open task(s) may benefit from clearer acceptance criteria.`,
        },
      ],
    }

    try {
      const parsed = await requestAiJson<typeof fallback>(
        [
          `Board: ${board.name}`,
          `Columns: ${JSON.stringify(columns.map((column) => ({ name: column.name, position: column.position })))}`,
          `Tasks: ${JSON.stringify(
            tasks.slice(0, 40).map((task) => ({
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
            })),
          )}`,
          'Return JSON with structure, process, and content arrays of {title, message} (max 3 each).',
        ].join('\n'),
        'You suggest board improvements. Return strict JSON.',
      )
      if (!parsed) return fallback
      return {
        structure: Array.isArray(parsed.structure) && parsed.structure.length ? parsed.structure : fallback.structure,
        process: Array.isArray(parsed.process) && parsed.process.length ? parsed.process : fallback.process,
        content: Array.isArray(parsed.content) && parsed.content.length ? parsed.content : fallback.content,
      }
    } catch {
      return fallback
    }
  },

  async assistantChat(
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    contextPack?: PlaceContextPack | null,
  ) {
    const fallback = {
      reply: contextPack
        ? `I can summarize “${contextPack.title}”, draft copy, or propose task changes for you to confirm. What should we do?`
        : 'I can help with TaskFlow: generate boards from a description, suggest workflows and templates, or explain workspaces → spaces → boards. What would you like to do?',
      suggestions: contextPack
        ? [
            'Summarize this board',
            'List overdue or at-risk tasks',
            'Draft 3 next tasks',
            'Suggest a comment for the top priority task',
          ]
        : [
            'Create a marketing campaign board',
            'Suggest a software delivery workflow',
            'Explain workspaces, spaces, and boards',
            'Show quick board templates',
          ],
      intent: 'none' as
        | 'none'
        | 'generate_board'
        | 'templates'
        | 'suggestions'
        | 'summarize'
        | 'draft'
        | 'tools',
      boardPrompt: null as string | null,
      placeLabel: contextPack?.label ?? null,
      toolCalls: [] as ProposedAgentTool[],
    }

    const trimmed = message.trim()
    if (!trimmed) return fallback

    const lower = trimmed.toLowerCase()
    const wantsBoard =
      !contextPack &&
      /\b(create|generate|make|build|draft)\b/.test(lower) &&
      /\b(board|kanban|workflow|pipeline)\b/.test(lower)
    const wantsTemplates = /\b(template|templates)\b/.test(lower)
    const wantsSuggestions = /\b(suggest|suggestion|ideas?|recommend)\b/.test(lower)
    const wantsSummarize = /\b(summar(y|ize)|overview|status|what's going on)\b/.test(lower)

    try {
      const recent = history
        .slice(-8)
        .map((item) => `${item.role === 'user' ? 'User' : 'Assistant'}: ${item.content}`)
        .join('\n')

      const parsed = await requestAiJson<{
        reply?: string
        suggestions?: string[]
        intent?: string
        boardPrompt?: string | null
        toolCalls?: Array<{
          id?: string
          name?: string
          summary?: string
          args?: Record<string, unknown>
        }>
      }>(
        [
          'You are TaskFlow AI, a place-aware project-management agent inside TaskFlow.',
          'TaskFlow hierarchy: workspaces contain spaces; spaces contain boards; boards have columns and tasks.',
          contextPack
            ? [
                `You are assisting in place: ${contextPack.label}.`,
                'Use ONLY the place snapshot below. Prefer actionable, concise answers.',
                'If the user asks to create/move/update tasks or comment, propose toolCalls (do not claim you already wrote).',
                'Allowed tool names: create_task, move_task, update_task, add_comment.',
                'create_task args: { title, columnId, description?, priority?, dueDate?, tags? }',
                'move_task args: { taskId, columnId, position? }',
                'update_task args: { taskId, title?, description?, priority?, dueDate? }',
                'add_comment args: { taskId, body }',
                'Use real column/task ids from the snapshot. Max 3 toolCalls.',
                'Return strict JSON: { reply, suggestions[3-4], intent: "none"|"summarize"|"draft"|"tools"|"suggestions", boardPrompt: null, toolCalls: [{id,name,summary,args}] }.',
                'Place snapshot:',
                contextPack.promptBlock,
              ].join('\n')
            : [
                'Help with planning, board structure, prioritization, and how to use TaskFlow. Be concise and practical.',
                'Return strict JSON: { reply: string, suggestions: string[3-4], intent: "none"|"generate_board"|"templates"|"suggestions", boardPrompt: string|null, toolCalls: [] }.',
                'Set intent to generate_board when the user clearly wants a new board created; put a clear generation prompt in boardPrompt.',
              ].join('\n'),
          recent ? `Recent conversation:\n${recent}` : '',
          `User message: ${trimmed}`,
        ]
          .filter(Boolean)
          .join('\n'),
        'You are TaskFlow AI assistant. Return strict JSON only.',
      )

      if (!parsed || typeof parsed.reply !== 'string' || !parsed.reply.trim()) {
        return {
          ...fallback,
          intent: wantsSummarize
            ? ('summarize' as const)
            : wantsBoard
              ? ('generate_board' as const)
              : wantsTemplates
                ? ('templates' as const)
                : wantsSuggestions
                  ? ('suggestions' as const)
                  : ('none' as const),
          boardPrompt: wantsBoard ? trimmed : null,
          reply: wantsBoard
            ? 'I can generate a board from that. I’ll draft columns and starter tasks next.'
            : wantsSummarize && contextPack
              ? `${contextPack.label}: ${contextPack.summary}. Ask me to go deeper on overdue work or next actions.`
              : fallback.reply,
        }
      }

      const allowedTools = new Set(['create_task', 'move_task', 'update_task', 'add_comment'])
      const toolCalls: ProposedAgentTool[] = Array.isArray(parsed.toolCalls)
        ? parsed.toolCalls
            .filter(
              (item) =>
                item &&
                typeof item.name === 'string' &&
                allowedTools.has(item.name) &&
                item.args &&
                typeof item.args === 'object',
            )
            .slice(0, 3)
            .map((item, index) => ({
              id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `tool_${index + 1}`,
              name: item.name as ProposedAgentTool['name'],
              summary:
                typeof item.summary === 'string' && item.summary.trim()
                  ? item.summary.trim().slice(0, 160)
                  : `${item.name}`,
              args: item.args as Record<string, unknown>,
            }))
        : []

      const intent =
        toolCalls.length > 0
          ? ('tools' as const)
          : parsed.intent === 'generate_board' ||
              parsed.intent === 'templates' ||
              parsed.intent === 'suggestions' ||
              parsed.intent === 'summarize' ||
              parsed.intent === 'draft' ||
              parsed.intent === 'tools'
            ? parsed.intent
            : wantsSummarize
              ? ('summarize' as const)
              : wantsBoard
                ? ('generate_board' as const)
                : wantsTemplates
                  ? ('templates' as const)
                  : wantsSuggestions
                    ? ('suggestions' as const)
                    : ('none' as const)

      return {
        reply: parsed.reply.trim(),
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.map(String).filter(Boolean).slice(0, 4)
          : fallback.suggestions,
        intent,
        boardPrompt:
          typeof parsed.boardPrompt === 'string' && parsed.boardPrompt.trim()
            ? parsed.boardPrompt.trim()
            : intent === 'generate_board'
              ? trimmed
              : null,
        placeLabel: contextPack?.label ?? null,
        toolCalls,
      }
    } catch {
      return {
        ...fallback,
        intent: wantsSummarize
          ? ('summarize' as const)
          : wantsBoard
            ? ('generate_board' as const)
            : wantsTemplates
              ? ('templates' as const)
              : wantsSuggestions
                ? ('suggestions' as const)
                : ('none' as const),
        boardPrompt: wantsBoard ? trimmed : null,
        reply: wantsBoard
          ? 'I can generate a board from that. I’ll draft columns and starter tasks next.'
          : fallback.reply,
      }
    }
  },

  async moderateContent(text: string) {
    const blockedPatterns = [/\b(hate|violence|terror)\b/i]
    const flagged = blockedPatterns.some((pattern) => pattern.test(text))
    const fallback = {
      allowed: !flagged,
      categories: flagged ? ['policy'] : [],
      confidence: flagged ? 0.7 : 0.95,
      reason: flagged ? 'Matched local safety heuristics' : 'No issues detected',
    }

    try {
      const parsed = await requestAiJson<{
        allowed?: boolean
        categories?: string[]
        confidence?: number
        reason?: string
      }>(
        `Moderate this text for a project-management product. Return JSON {allowed, categories, confidence, reason}.\nText: ${text}`,
        'You are a content moderation assistant. Return strict JSON.',
      )
      if (!parsed || typeof parsed.allowed !== 'boolean') return fallback
      return {
        allowed: parsed.allowed,
        categories: Array.isArray(parsed.categories) ? parsed.categories.map(String) : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : fallback.confidence,
        reason: typeof parsed.reason === 'string' ? parsed.reason : fallback.reason,
      }
    } catch {
      return fallback
    }
  },
}
