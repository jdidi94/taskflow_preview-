import { z } from 'zod'
import { objectIdSchema } from './workspace.schemas.js'

export const createInvitationSchema = z.object({
  type: z.enum(['workspace', 'space', 'board']),
  email: z.string().email(),
  targetEntityId: objectIdSchema,
  role: z.enum(['viewer', 'member', 'contributor', 'admin', 'owner']).default('member'),
  message: z.string().max(500).optional(),
})

export const bulkInviteSchema = z.object({
  type: z.enum(['workspace', 'space', 'board']),
  targetEntityId: objectIdSchema,
  emails: z.array(z.string().email()).min(1).max(50),
  role: z.enum(['viewer', 'member', 'contributor', 'admin', 'owner']).default('member'),
  message: z.string().max(500).optional(),
})

export const invitationIdParamSchema = z.object({ invitationId: objectIdSchema })
export const invitationTokenParamSchema = z.object({ token: z.string().min(1) })
export const invitationStatsParamSchema = z.object({
  entityType: z.enum(['Workspace', 'Space', 'Board']),
  entityId: objectIdSchema,
})
