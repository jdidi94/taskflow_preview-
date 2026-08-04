import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

export const boardTypeEnum = z.enum(['kanban', 'list', 'calendar', 'timeline'])
export const recommendationTypeEnum = z.enum(['all', 'next_tasks', 'optimization'])
export const performancePeriodEnum = z.enum(['7d', '14d', '30d', '90d'])

export const taskSuggestionsSchema = z.object({
  spaceGoal: z.string().min(10).max(1000),
  spaceContext: z.string().max(2000).optional(),
  boardType: boardTypeEnum.default('kanban'),
})

export const naturalLanguageSchema = z.object({
  input: z.string().min(3).max(500),
  boardId: objectIdSchema.optional(),
})

export const timelineSchema = z.object({
  startDate: z.string().datetime().optional(),
  targetEndDate: z.string().datetime().optional(),
  priorities: z.array(z.enum(['low', 'medium', 'high', 'critical'])).optional(),
})

export const taskDescriptionSchema = z.object({
  title: z.string().min(2).max(200),
  spaceContext: z.string().max(500).optional(),
  taskType: z.string().max(100).optional(),
})

export const aiSpaceParamsSchema = z.object({
  spaceId: objectIdSchema,
})

export const aiBoardParamsSchema = z.object({
  boardId: objectIdSchema,
})

export const aiRecommendationsQuerySchema = z.object({
  type: recommendationTypeEnum.default('all').optional(),
})

export const aiPerformanceQuerySchema = z.object({
  period: performancePeriodEnum.default('30d').optional(),
})

