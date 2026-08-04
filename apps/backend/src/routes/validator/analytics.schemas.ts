import { z } from 'zod'
import { objectIdSchema } from './workspace.schemas.js'

export const analyticsPeriodSchema = z.enum(['week', 'month', 'quarter', 'year'])

export const analyticsRangeQuerySchema = z.object({
  period: analyticsPeriodSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const analyticsExportQuerySchema = analyticsRangeQuerySchema.extend({
  format: z.enum(['json', 'csv']).default('json'),
})

export const analyticsUserQuerySchema = z.object({
  // Matches the v2/mobiles UI naming: 1m | 3m | 6m | 12m
  range: z.enum(['1m', '3m', '6m', '12m']).optional(),
})

export const workspaceAnalyticsParamsSchema = z.object({
  workspaceId: objectIdSchema,
})

export const spaceAnalyticsParamsSchema = z.object({
  spaceId: objectIdSchema,
})

export const generateSpaceAnalyticsBodySchema = z.object({
  periodType: analyticsPeriodSchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeAI: z.boolean().optional(),
})

