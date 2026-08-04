import { z } from 'zod'

import { objectIdSchema } from './workspace.schemas.js'

const templateTypeEnum = z.enum(['task', 'board', 'space', 'workflow', 'checklist'])

const templateCategoryEnum = z.enum([
  'Marketing',
  'Development',
  'Design',
  'Sales',
  'Support',
  'Operations',
  'HR',
  'Finance',
  'General',
  'Custom',
])

export const templateIdParamsSchema = z.object({ id: objectIdSchema })

export const templateListQuerySchema = z.object({
  type: templateTypeEnum.optional(),
  category: templateCategoryEnum.optional(),
  q: z.string().min(1).optional(),
  isPublic: z.enum(['true', 'false']).optional(),
  status: z.enum(['draft', 'active', 'archived', 'deprecated']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  workspaceId: objectIdSchema.optional(),
  scope: z.enum(['all']).optional(),
})

export const templateAccessControlSchema = z.object({
  allowedUsers: z.array(objectIdSchema).optional(),
  allowedWorkspaces: z.array(objectIdSchema).optional(),
  allowedRoles: z
    .array(
      z.enum([
        'user',
        'manager',
        'team_member',
        'admin',
        'superadmin',
        'super_admin',
        'moderator',
        'viewer',
      ]),
    )
    .optional(),
})

export const createTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  type: templateTypeEnum,
  content: z.any(),
  category: templateCategoryEnum.optional().default('General'),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isPublic: z.boolean().optional(),
  status: z.enum(['draft', 'active', 'archived', 'deprecated']).optional(),
  accessControl: templateAccessControlSchema.optional(),
})

export const updateTemplateSchema = createTemplateSchema
  .partial()
  .extend({
    op: z.enum(['increment_views', 'toggle_like']).optional(),
  })

