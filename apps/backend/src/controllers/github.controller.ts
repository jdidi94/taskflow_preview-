import type { Response } from 'express'

import type { AuthedRequest } from '../middlewares/auth.js'
import { User } from '../models/User.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { param } from '../utils/params.js'
import { githubService } from '../services/github.service.js'
import { githubStatsService } from '../services/githubStats.service.js'

async function getUserWithGithub(userId: string, includeToken = false) {
  const query = User.findById(userId)
  if (includeToken) query.select('+github.accessToken')
  const user = await query
  if (!user) throw new AppError('User not found', 404)
  return user
}

function getLinkedAccessToken(user: any) {
  const encrypted = user.github?.accessToken as string | undefined
  const accessToken = githubService.decryptToken(encrypted)
  if (!accessToken) throw new AppError('Invalid GitHub token', 400)
  return accessToken
}

function ensureGithubLinked(user: any) {
  if (!user.github?.linked) throw new AppError('GitHub account is not linked', 400)
}

function serializeSnapshot(snapshot: any) {
  if (!snapshot) return null
  return {
    orgLogin: snapshot.orgLogin,
    syncedAt: snapshot.syncedAt,
    overview: {
      reposCount: snapshot.overview?.reposCount ?? 0,
      openPrs: snapshot.overview?.openPrs ?? 0,
      openIssues: snapshot.overview?.openIssues ?? 0,
      lastActivityAt: snapshot.overview?.lastActivityAt ?? null,
    },
    repos: (snapshot.repos ?? []).map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.fullName,
      htmlUrl: repo.htmlUrl,
      language: repo.language ?? null,
      stars: repo.stars ?? 0,
      forks: repo.forks ?? 0,
      openPrs: repo.openPrs ?? 0,
      openIssues: repo.openIssues ?? 0,
      pushedAt: repo.pushedAt ?? null,
      isPrivate: Boolean(repo.isPrivate),
    })),
    pulse7: snapshot.pulse7 ?? { commits: 0, prsMerged: 0, issuesClosed: 0, series: [] },
    pulse30: snapshot.pulse30 ?? { commits: 0, prsMerged: 0, issuesClosed: 0, series: [] },
  }
}

export const linkGitHubAccount = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { code, redirectUri } = req.body as { code: string; redirectUri?: string }
  const user = await getUserWithGithub(req.user!.sub)

  if (user.github?.linked) throw new AppError('GitHub account is already linked', 400)

  let tokenData
  try {
    tokenData = await githubService.exchangeCodeForToken(code, redirectUri)
  } catch (err) {
    throw new AppError(err instanceof Error ? err.message : 'Failed to exchange GitHub code', 400)
  }
  const scopeCheck = await githubService.checkTokenScopes(tokenData.accessToken)
  if (!scopeCheck.hasRequiredScopes) {
    throw new AppError('Insufficient GitHub permissions', 400, {
      missingScopes: scopeCheck.missingScopes,
      message: 'Please re-authenticate with required permissions: read:org and repo',
    })
  }

  const [profile, emails] = await Promise.all([
    githubService.getUserProfile(tokenData.accessToken),
    githubService.getUserEmails(tokenData.accessToken),
  ])

  const primaryEmail =
    emails.find((item) => item.primary && item.verified) ??
    emails.find((item) => item.verified) ??
    emails[0]

  user.githubId = profile.id
  user.github = {
    accessToken: githubService.encryptToken(tokenData.accessToken),
    githubId: profile.id,
    username: profile.login,
    avatar: profile.avatar,
    email: primaryEmail?.email ?? profile.email,
    scope: tokenData.scope,
    tokenType: tokenData.tokenType,
    linked: true,
    tokenValid: true,
    lastSync: new Date(),
  }

  const currentProviders = new Set(user.oauthProviders ?? [])
  currentProviders.add('github')
  user.oauthProviders = Array.from(currentProviders) as Array<'github' | 'google'>
  user.hasOAuthProviders = user.oauthProviders.length > 0
  await user.save()

  res.json({
    success: true,
    data: {
      githubUsername: profile.login,
      githubEmail: user.github.email,
      scope: tokenData.scope,
      hasRequiredScopes: true,
    },
  })
})

export const getUserOrganizations = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserWithGithub(req.user!.sub, true)
  ensureGithubLinked(user)
  const accessToken = getLinkedAccessToken(user)
  const validation = await githubService.validateGitHubIntegration(accessToken)
  if (!validation.isValid) {
    throw new AppError(validation.message, validation.reason === 'insufficient_scopes' ? 403 : 400, {
      action: 'redirect',
      missingScopes: validation.missingScopes,
      userScopes: validation.userScopes,
      reason: validation.reason,
    })
  }

  const organizations = await githubService.getOrganizations(accessToken)
  res.json({ success: true, data: organizations })
})

export const getOrganizationRepositories = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const org = param(req, 'org')
  const user = await getUserWithGithub(req.user!.sub, true)
  ensureGithubLinked(user)
  const accessToken = getLinkedAccessToken(user)
  const scopeCheck = await githubService.checkTokenScopes(accessToken)
  if (!scopeCheck.hasRequiredScopes) {
    throw new AppError(
      'Insufficient GitHub permissions. You need at least read:org scope to access repositories.',
      403,
      { action: 'redirect', missingScopes: scopeCheck.missingScopes },
    )
  }

  const repositories = await githubService.getRepositories(accessToken, org)
  res.json({ success: true, data: { organization: org, repositories } })
})

export const getRepositoryBranches = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const org = param(req, 'org')
  const repo = param(req, 'repo')
  const user = await getUserWithGithub(req.user!.sub, true)
  ensureGithubLinked(user)
  const accessToken = getLinkedAccessToken(user)
  const scopeCheck = await githubService.checkTokenScopes(accessToken)
  if (!scopeCheck.hasRequiredScopes) {
    throw new AppError(
      'Insufficient GitHub permissions. You need at least read:org scope to access repository branches.',
      403,
      { action: 'redirect', missingScopes: scopeCheck.missingScopes },
    )
  }

  const branches = await githubService.getRepositoryBranches(accessToken, org, repo)
  res.json({ success: true, data: { organization: org, repository: repo, branches } })
})

export const getOrganizationMembers = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const org = param(req, 'org')
  const user = await getUserWithGithub(req.user!.sub, true)
  ensureGithubLinked(user)
  const accessToken = getLinkedAccessToken(user)
  const isValid = await githubService.validateToken(accessToken)
  if (!isValid) throw new AppError('GitHub token is invalid or expired', 400)

  const members = await githubService.getOrganizationMembers(accessToken, org)
  res.json({ success: true, data: { organization: org, members } })
})

export const getOrganizationMembersWithEmails = asyncHandler(
  async (req: AuthedRequest, res: Response) => {
    const org = param(req, 'org')
    const user = await getUserWithGithub(req.user!.sub, true)
    ensureGithubLinked(user)
    const accessToken = getLinkedAccessToken(user)
    const isValid = await githubService.validateToken(accessToken)
    if (!isValid) throw new AppError('GitHub token is invalid or expired', 400)

    const members = await githubService.mapOrgMembersToEmails(accessToken, org)
    res.json({
      success: true,
      data: {
        organization: org,
        members,
        totalMembers: members.length,
        appUsers: members.filter((member) => member.isAppUser).length,
      },
    })
  },
)

export const syncGitHubData = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const { workspaceId, force } = req.body as { workspaceId: string; force?: boolean }
  const user = await getUserWithGithub(req.user!.sub, true)
  ensureGithubLinked(user)
  const accessToken = getLinkedAccessToken(user)

  const isValid = await githubService.validateToken(accessToken)
  if (!isValid) throw new AppError('GitHub token is invalid or expired', 400)

  const scopeCheck = await githubService.checkTokenScopes(accessToken)
  if (!scopeCheck.hasRequiredScopes) {
    throw new AppError('Insufficient GitHub permissions', 400, {
      missingScopes: scopeCheck.missingScopes,
    })
  }

  const snapshot = await githubStatsService.syncWorkspaceOrg({
    workspaceId,
    userId: req.user!.sub,
    accessToken,
    force: Boolean(force),
  })

  user.github = {
    ...user.github,
    linked: true,
    tokenValid: true,
    lastSync: snapshot.syncedAt,
  }
  await user.save()

  res.json({
    success: true,
    data: {
      lastSync: snapshot.syncedAt,
      hasRequiredScopes: true,
      orgLogin: snapshot.orgLogin,
      overview: serializeSnapshot(snapshot)?.overview ?? null,
    },
  })
})

export const getGitHubStatsOverview = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const workspaceId = String((req as any).validatedQuery?.workspaceId ?? req.query.workspaceId ?? '')
  const { orgLogin, snapshot } = await githubStatsService.getSnapshot(workspaceId, req.user!.sub)
  if (!orgLogin) {
    res.json({
      success: true,
      data: { linkedOrg: false, synced: false, overview: null, syncedAt: null, orgLogin: null },
    })
    return
  }
  const serialized = serializeSnapshot(snapshot)
  res.json({
    success: true,
    data: {
      linkedOrg: true,
      synced: Boolean(serialized),
      orgLogin,
      syncedAt: serialized?.syncedAt ?? null,
      overview: serialized?.overview ?? null,
    },
  })
})

export const getGitHubStatsRepos = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const workspaceId = String((req as any).validatedQuery?.workspaceId ?? req.query.workspaceId ?? '')
  const { orgLogin, snapshot } = await githubStatsService.getSnapshot(workspaceId, req.user!.sub)
  if (!orgLogin) {
    res.json({
      success: true,
      data: { linkedOrg: false, synced: false, orgLogin: null, syncedAt: null, repositories: [] },
    })
    return
  }
  const serialized = serializeSnapshot(snapshot)
  res.json({
    success: true,
    data: {
      linkedOrg: true,
      synced: Boolean(serialized),
      orgLogin,
      syncedAt: serialized?.syncedAt ?? null,
      repositories: serialized?.repos ?? [],
    },
  })
})

export const getGitHubStatsPulse = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const q = (req as any).validatedQuery as { workspaceId: string; days: number } | undefined
  const workspaceId = String(q?.workspaceId ?? req.query.workspaceId ?? '')
  const days = Number(q?.days ?? req.query.days) === 30 ? 30 : 7
  const { orgLogin, snapshot } = await githubStatsService.getSnapshot(workspaceId, req.user!.sub)
  if (!orgLogin) {
    res.json({
      success: true,
      data: {
        linkedOrg: false,
        synced: false,
        orgLogin: null,
        syncedAt: null,
        days,
        pulse: { commits: 0, prsMerged: 0, issuesClosed: 0, series: [] },
      },
    })
    return
  }
  const serialized = serializeSnapshot(snapshot)
  const pulse = days === 30 ? serialized?.pulse30 : serialized?.pulse7
  res.json({
    success: true,
    data: {
      linkedOrg: true,
      synced: Boolean(serialized),
      orgLogin,
      syncedAt: serialized?.syncedAt ?? null,
      days,
      pulse: pulse ?? { commits: 0, prsMerged: 0, issuesClosed: 0, series: [] },
    },
  })
})

export const unlinkGitHubAccount = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserWithGithub(req.user!.sub)
  ensureGithubLinked(user)

  user.githubId = null
  user.github = {
    accessToken: null,
    githubId: null,
    username: null,
    avatar: null,
    email: null,
    scope: null,
    tokenType: null,
    linked: false,
    tokenValid: false,
    lastSync: null,
  }
  user.oauthProviders = (user.oauthProviders ?? []).filter((provider) => provider !== 'github')
  user.hasOAuthProviders = user.oauthProviders.length > 0
  await user.save()

  res.json({ success: true })
})

export const forceReAuth = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserWithGithub(req.user!.sub)
  ensureGithubLinked(user)

  user.githubId = null
  user.github = {
    accessToken: null,
    githubId: null,
    username: null,
    avatar: null,
    email: null,
    scope: null,
    tokenType: null,
    linked: false,
    tokenValid: false,
    lastSync: null,
  }
  user.oauthProviders = (user.oauthProviders ?? []).filter((provider) => provider !== 'github')
  user.hasOAuthProviders = user.oauthProviders.length > 0
  await user.save()

  res.json({ success: true, data: { redirectUrl: '/github/connect' } })
})

export const getGitHubStatus = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const user = await getUserWithGithub(req.user!.sub, true)
  const linked = Boolean(user.github?.linked && user.github?.accessToken)
  if (!linked) {
    res.json({
      success: true,
      data: {
        linked: false,
        tokenValid: false,
        hasRequiredScopes: false,
        missingScopes: ['read:org', 'repo'],
        validation: null,
      },
    })
    return
  }

  const accessToken = getLinkedAccessToken(user)
  const scopeCheck = await githubService.checkTokenScopes(accessToken)
  const validation = await githubService.validateGitHubIntegration(accessToken)

  user.github = {
    ...user.github,
    linked: true,
    tokenValid: validation.tokenValid,
  }
  await user.save()

  res.json({
    success: true,
    data: {
      linked: true,
      tokenValid: validation.tokenValid,
      hasRequiredScopes: scopeCheck.hasRequiredScopes,
      missingScopes: scopeCheck.missingScopes,
      validation,
      github: {
        username: user.github?.username ?? null,
        email: user.github?.email ?? null,
        avatar: user.github?.avatar ?? null,
        scope: user.github?.scope ?? null,
        lastSync: user.github?.lastSync ?? null,
      },
    },
  })
})

