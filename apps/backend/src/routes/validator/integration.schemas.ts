import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

const integrationCategoryEnum = z.enum([
  'communication',
  'storage',
  'analytics',
  'development',
  'marketing',
])

const integrationStatusEnum = z.enum(['active', 'inactive', 'error', 'pending'])
const integrationSyncStatusEnum = z.enum(['success', 'warning', 'error'])

export const integrationIdParamsSchema = z.object({
  id: objectIdSchema,
})

export const integrationListQuerySchema = z.object({
  category: integrationCategoryEnum.optional(),
  status: integrationStatusEnum.optional(),
  search: z.string().min(1).optional(),
})

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  category: integrationCategoryEnum,
  status: integrationStatusEnum.optional(),
  apiKey: z.string().min(1).optional(),
  config: z.record(z.string(), z.any()).optional(),
  isEnabled: z.boolean().optional(),
  errorMessage: z.string().max(1000).nullable().optional(),
  syncInterval: z.coerce.number().int().min(1).max(10080).optional(),
  webhookUrl: z.string().url().nullable().optional(),
  webhookSecret: z.string().min(1).nullable().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export const updateIntegrationSchema = createIntegrationSchema
  .partial()
  .extend({
    syncStatus: integrationSyncStatusEnum.optional(),
    lastSync: z.string().datetime().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const toggleIntegrationSchema = z.object({}).passthrough()

