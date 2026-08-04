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

export const driveLinkBodySchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url().optional(),
})

export const driveListQuerySchema = z.object({
  pageToken: z.string().optional(),
  q: z.string().max(200).optional(),
})

export const driveAttachBodySchema = z.object({
  driveFileId: z.string().min(1),
  taskId: objectIdSchema.optional(),
  category: fileCategoryEnum.default('task_attachment'),
})

export const linkExternalFileBodySchema = z.object({
  source: z.enum(['google_drive', 'url']),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(200).default('application/octet-stream'),
  size: z.coerce.number().int().min(0).optional(),
  externalId: z.string().max(200).optional(),
  externalUrl: z.string().url(),
  taskId: objectIdSchema.optional(),
  category: fileCategoryEnum.default('task_attachment'),
  thumbnailLink: z.string().url().optional(),
  iconLink: z.string().url().optional(),
})

export type FileCategoryFromSchema = FileCategory

