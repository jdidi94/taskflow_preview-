import { z } from 'zod'

export const githubLinkSchema = z.object({
  code: z.string().min(1),
})

export const githubOrgParamsSchema = z.object({
  org: z.string().min(1).max(100),
})

export const githubRepoParamsSchema = z.object({
  org: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
})

