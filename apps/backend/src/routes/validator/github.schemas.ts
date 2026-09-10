import { z } from 'zod'

export const githubLinkSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url().optional(),
})

export const githubOrgParamsSchema = z.object({
  org: z.string().min(1).max(100),
})

export const githubRepoParamsSchema = z.object({
  org: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
})

export const githubSyncSchema = z.object({
  workspaceId: z.string().min(1),
  force: z.boolean().optional(),
})

export const githubStatsQuerySchema = z.object({
  workspaceId: z.string().min(1),
})

export const githubPulseQuerySchema = z.object({
  workspaceId: z.string().min(1),
  days: z.coerce.number().int().refine((n) => n === 7 || n === 30, {
    message: 'days must be 7 or 30',
  }),
})
