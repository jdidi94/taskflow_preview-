import { z } from 'zod'
import { objectIdSchema } from './workspace.schemas.js'

export const createBoardSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(500).optional(),
  spaceId: objectIdSchema,
  type: z.enum(['kanban', 'list', 'calendar', 'timeline']).default('kanban'),
  visibility: z.enum(['private', 'workspace', 'public']).default('private'),
})

export const updateBoardSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(500).optional(),
    type: z.enum(['kanban', 'list', 'calendar', 'timeline']).optional(),
    visibility: z.enum(['private', 'workspace', 'public']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
  position: z.number().int().min(0).optional(),
  limit: z.number().int().min(0).nullable().optional(),
})

export const updateColumnSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    position: z.number().int().min(0).optional(),
    limit: z.number().int().min(0).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const reorderColumnsSchema = z.object({
  columnIds: z.array(objectIdSchema).min(1),
})

export const boardIdParamSchema = z.object({ id: objectIdSchema })
export const boardSpaceParamSchema = z.object({ id: objectIdSchema })
export const boardColumnParamSchema = z.object({
  id: objectIdSchema,
  columnId: objectIdSchema,
})
