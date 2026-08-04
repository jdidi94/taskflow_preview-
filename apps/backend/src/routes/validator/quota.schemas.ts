import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

export const quotaTypeEnum = z.enum([
  'api_requests',
  'file_uploads',
  'ai_jobs',
  'storage',
  'users',
  'spaces',
])
export const quotaPeriodEnum = z.enum(['hourly', 'daily', 'weekly', 'monthly', 'yearly'])
export const quotaStatusEnum = z.enum(['active', 'inactive', 'exceeded'])

export const quotaIdParamsSchema = z.object({ id: objectIdSchema })

export const quotaListQuerySchema = z.object({
  userId: objectIdSchema.optional(),
  workspaceId: objectIdSchema.optional(),
  type: quotaTypeEnum.optional(),
  status: quotaStatusEnum.optional(),
})

export const quotaStatsQuerySchema = z.object({
  userId: objectIdSchema.optional(),
  workspaceId: objectIdSchema.optional(),
})

export const createQuotaSchema = z.object({
  userId: objectIdSchema,
  workspaceId: objectIdSchema.nullable().optional(),
  type: quotaTypeEnum,
  period: quotaPeriodEnum.default('monthly'),
  limit: z.coerce.number().int().min(0),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateQuotaSchema = z
  .object({
    limit: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    alerts: z
      .object({
        warningThreshold: z.coerce.number().min(0).max(1).optional(),
        criticalThreshold: z.coerce.number().min(0).max(1).optional(),
      })
      .optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const overrideQuotaSchema = z.object({
  reason: z.string().min(1).max(500),
  expiresAt: z.string().datetime().nullable().optional(),
})
