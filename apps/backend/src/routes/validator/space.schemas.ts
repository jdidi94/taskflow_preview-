import { z } from 'zod'
import { objectIdSchema } from './workspace.schemas.js'

export const createSpaceSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  workspaceId: objectIdSchema,
})

export const updateSpaceSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const addSpaceMemberSchema = z.object({
  userId: objectIdSchema,
  role: z.enum(['viewer', 'member', 'admin']).default('member'),
})

export const spaceIdParamSchema = z.object({ id: objectIdSchema })
export const spaceWorkspaceParamSchema = z.object({ workspaceId: objectIdSchema })
export const spaceMemberParamSchema = z.object({
  id: objectIdSchema,
  memberId: objectIdSchema,
})
