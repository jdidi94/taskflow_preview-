import { z } from 'zod'

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  avatar: z.string().nullable().optional(),
})

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    description: z.string().max(1000).optional(),
    avatar: z.string().nullable().optional(),
    githubOrg: z
      .object({
        id: z.number().nullable(),
        login: z.string().nullable(),
        name: z.string().nullable(),
        url: z.string().nullable(),
        avatar: z.string().nullable(),
        description: z.string().nullable(),
        linkedAt: z.string().datetime().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'No changes provided' })

export const inviteWorkspaceMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']).default('member'),
  message: z.string().max(500).optional(),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
})

export const workspaceIdParamSchema = z.object({ id: objectIdSchema })
export const workspaceMemberParamSchema = z.object({
  id: objectIdSchema,
  memberId: objectIdSchema,
})
export const invitationTokenParamSchema = z.object({ token: z.string().min(1) })

export const updateWorkspaceRulesSchema = z.object({
  content: z.string().max(20000),
})
