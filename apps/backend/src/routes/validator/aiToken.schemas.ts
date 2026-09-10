import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

export const aiProviderEnum = z.enum(['google', 'openai', 'anthropic', 'azure', 'groq'])

const aiTokenStatusEnum = z.enum(['active', 'inactive', 'archived', 'invalid'])

const aiTokenConfigSchema = z
  .object({
    model: z.string().min(1).max(200).optional(),
    maxTokens: z.coerce.number().int().min(1).max(200000).optional(),
    temperature: z.coerce.number().min(0).max(2).optional(),
    timeout: z.coerce.number().int().min(1000).max(300000).optional(),
  })
  .partial()

export const aiTokenIdParamsSchema = z.object({
  tokenId: objectIdSchema,
})

export const aiProviderParamsSchema = z.object({
  provider: aiProviderEnum,
})

export const aiTokenListQuerySchema = z.object({
  provider: aiProviderEnum.optional(),
  status: aiTokenStatusEnum.optional(),
  includeArchived: z
    .union([z.coerce.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
})

export const createAiTokenSchema = z.object({
  provider: aiProviderEnum.default('google'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  token: z.string().min(1).max(10000),
  config: aiTokenConfigSchema.optional(),
  notes: z.string().max(1000).optional(),
})

export const updateAiTokenSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    config: aiTokenConfigSchema.optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

