import { Router } from 'express'

import * as githubController from '../controllers/github.controller.js'
import { authenticate } from '../middlewares/auth.js'
import { validateBody, validateParams, validateQuery } from '../middlewares/validate.js'
import {
  githubLinkSchema,
  githubOrgParamsSchema,
  githubPulseQuerySchema,
  githubRepoParamsSchema,
  githubStatsQuerySchema,
  githubSyncSchema,
} from './validator/github.schemas.js'

export const githubRouter = Router()

githubRouter.use(authenticate)

githubRouter.post('/link', validateBody(githubLinkSchema), githubController.linkGitHubAccount)
githubRouter.get('/orgs', githubController.getUserOrganizations)
githubRouter.get(
  '/orgs/:org/repos',
  validateParams(githubOrgParamsSchema),
  githubController.getOrganizationRepositories,
)
githubRouter.get(
  '/repos/:org/:repo/branches',
  validateParams(githubRepoParamsSchema),
  githubController.getRepositoryBranches,
)
githubRouter.get(
  '/orgs/:org/members',
  validateParams(githubOrgParamsSchema),
  githubController.getOrganizationMembers,
)
githubRouter.get(
  '/orgs/:org/members-with-emails',
  validateParams(githubOrgParamsSchema),
  githubController.getOrganizationMembersWithEmails,
)
githubRouter.post('/sync', validateBody(githubSyncSchema), githubController.syncGitHubData)
githubRouter.get(
  '/stats/overview',
  validateQuery(githubStatsQuerySchema),
  githubController.getGitHubStatsOverview,
)
githubRouter.get(
  '/stats/repos',
  validateQuery(githubStatsQuerySchema),
  githubController.getGitHubStatsRepos,
)
githubRouter.get(
  '/stats/pulse',
  validateQuery(githubPulseQuerySchema),
  githubController.getGitHubStatsPulse,
)
githubRouter.delete('/unlink', githubController.unlinkGitHubAccount)
githubRouter.post('/force-reauth', githubController.forceReAuth)
githubRouter.get('/status', githubController.getGitHubStatus)
