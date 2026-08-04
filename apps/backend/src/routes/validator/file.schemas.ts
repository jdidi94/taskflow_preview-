import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'
import type { FileCategory } from '../../models/File.js'

export const fileCategoryEnum = z.enum([
  'avatar',
  'task_attachment',
  'comment_attachment',
  'logo',
  'board_background',
  'general',
])

export const fileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: fileCategoryEnum.optional(),
})

export const fileIdParamsSchema = z.object({ id: objectIdSchema })

export type FileCategoryFromSchema = FileCategory

