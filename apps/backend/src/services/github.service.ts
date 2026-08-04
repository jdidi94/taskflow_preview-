import crypto from 'node:crypto'

import { env } from '../config/env.js'
import { User } from '../models/User.js'

const GITHUB_API_BASE = 'https://api.github.com'
const REQUIRED_SCOPES = ['read:org', 'repo']

type GithubHeaders = {
  Authorization: string
  Accept: string
  'User-Agent': string
}

function encryptionKey() {
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest()
}

function githubHeaders(accessToken: string): GithubHeaders {
  return {
    Authorization: `token ${accessToken}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TaskFlow-AI-v3',
  }
}

async function fetchGithub(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<{ response: Response; data: any }> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      ...githubHeaders(accessToken),
      ...(init?.headers ?? {}),
    },
  })

  const raw = await response.text()
  const data = raw ? JSON.parse(raw) : null
  if (!response.ok) {
    throw new Error(data?.message || `GitHub API request failed (${response.status})`)
  }

  return { response, data }
}

function parseScopeHeader(header: string | null): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const githubService = {
  encryptToken(token: string) {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv)
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`
  },

  decryptToken(value: string | null | undefined) {
    if (!value) return null
    const [ivB64, tagB64, cipherB64] = value.split(':')
    if (!ivB64 || !tagB64 || !cipherB64) return null

    try {
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        encryptionKey(),
        Buffer.from(ivB64, 'base64'),
      )
      decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(cipherB64, 'base64')),
        decipher.final(),
      ])
      return decrypted.toString('utf8')
    } catch {
      return null
    }
  },

  async exchangeCodeForToken(code: string, redirectUri?: string) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      }),
    })

    const data = (await response.json()) as any
    if (!response.ok || data.error) {
      throw new Error(data.error_description || data.error || 'Failed to exchange code for token')
    }

    return {
      accessToken: data.access_token as string,
      scope: (data.scope as string | undefined) ?? '',
      tokenType: (data.token_type as string | undefined) ?? 'bearer',
    }
  },

  async getUserProfile(accessToken: string) {
    const { data } = await fetchGithub('/user', accessToken)
    return {
      id: String(data.id),
      login: data.login as string,
      name: (data.name as string | null) ?? null,
      email: (data.email as string | null) ?? null,
      avatar: (data.avatar_url as string | null) ?? null,
      url: (data.url as string | null) ?? null,
      htmlUrl: (data.html_url as string | null) ?? null,
    }
  },

  async getUserEmails(accessToken: string) {
    const { data } = await fetchGithub('/user/emails', accessToken)
    return (data as any[]).map((email) => ({
      email: email.email as string,
      primary: Boolean(email.primary),
      verified: Boolean(email.verified),
      visibility: (email.visibility as string | null) ?? null,
    }))
  },

  async getOrganizations(accessToken: string) {
    const { data } = await fetchGithub('/user/orgs?per_page=100', accessToken)
    return (data as any[]).map((org) => ({
      id: org.id,
      login: org.login,
      name: org.name || org.login,
      description: org.description ?? null,
      url: org.url,
      htmlUrl: org.html_url,
      avatar: org.avatar_url,
      type: org.type,
      siteAdmin: Boolean(org.site_admin),
    }))
  },

  async getRepositories(accessToken: string, org: string) {
    const { data } = await fetchGithub(`/orgs/${encodeURIComponent(org)}/repos?per_page=100`, accessToken)
    return (data as any[]).map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description ?? null,
      url: repo.url,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      isPrivate: Boolean(repo.private),
      isFork: Boolean(repo.fork),
      language: repo.language ?? null,
      defaultBranch: repo.default_branch,
      updatedAt: repo.updated_at,
    }))
  },

  async getRepositoryBranches(accessToken: string, org: string, repo: string) {
    const { data } = await fetchGithub(
      `/repos/${encodeURIComponent(org)}/${encodeURIComponent(repo)}/branches?per_page=100`,
      accessToken,
    )
    return (data as any[]).map((branch) => ({
      name: branch.name,
      commit: {
        sha: branch.commit?.sha,
        url: branch.commit?.url,
      },
      protection: {
        enabled: Boolean(branch.protection?.enabled),
        requiredStatusChecks: Boolean(branch.protection?.required_status_checks?.enabled),
        enforceAdmins: Boolean(branch.protection?.enforce_admins?.enabled),
      },
    }))
  },

  async getOrganizationMembers(accessToken: string, org: string) {
    const { data } = await fetchGithub(
      `/orgs/${encodeURIComponent(org)}/members?per_page=100`,
      accessToken,
    )
    return (data as any[]).map((member) => ({
      id: member.id,
      login: member.login,
      name: member.login,
      email: null,
      avatar: member.avatar_url,
      url: member.url,
      htmlUrl: member.html_url,
      type: member.type,
      siteAdmin: Boolean(member.site_admin),
    }))
  },

  async mapOrgMembersToEmails(accessToken: string, org: string) {
    const members = await this.getOrganizationMembers(accessToken, org)
    const users = await User.find({
      'github.username': { $in: members.map((member) => member.login) },
      'github.linked': true,
    }).select('github.username github.email email name')

    const byUsername = new Map<string, { email: string | null; name: string; userId: string }>()
    for (const user of users) {
      const username = user.github?.username
      if (!username) continue
      byUsername.set(username, {
        email: user.github?.email ?? user.email,
        name: user.name,
        userId: user._id.toString(),
      })
    }

    return members.map((member) => {
      const mapped = byUsername.get(member.login)
      return {
        ...member,
        email: mapped?.email ?? null,
        name: mapped?.name ?? member.login,
        userId: mapped?.userId ?? null,
        isAppUser: Boolean(mapped),
      }
    })
  },

  async validateToken(accessToken: string) {
    try {
      const { response } = await fetchGithub('/user', accessToken)
      return response.ok
    } catch {
      return false
    }
  },

  async checkTokenScopes(accessToken: string) {
    try {
      const { response } = await fetchGithub('/user', accessToken)
      const userScopes = parseScopeHeader(response.headers.get('x-oauth-scopes'))
      const missingScopes = REQUIRED_SCOPES.filter((scope) => !userScopes.includes(scope))
      return {
        hasRequiredScopes: missingScopes.length === 0,
        missingScopes,
        userScopes,
      }
    } catch {
      return {
        hasRequiredScopes: false,
        missingScopes: [...REQUIRED_SCOPES],
        userScopes: [],
      }
    }
  },

  async validateGitHubIntegration(accessToken: string) {
    const tokenValid = await this.validateToken(accessToken)
    if (!tokenValid) {
      return {
        isValid: false,
        tokenValid: false,
        reason: 'invalid_token',
        message: 'GitHub token is invalid or expired',
        missingScopes: [...REQUIRED_SCOPES],
        userScopes: [],
      }
    }

    const scopeCheck = await this.checkTokenScopes(accessToken)
    if (!scopeCheck.hasRequiredScopes) {
      return {
        isValid: false,
        tokenValid: true,
        reason: 'insufficient_scopes',
        message: 'GitHub token lacks required scopes',
        missingScopes: scopeCheck.missingScopes,
        userScopes: scopeCheck.userScopes,
      }
    }

    try {
      const orgs = await this.getOrganizations(accessToken)
      if (orgs.length === 0) {
        return {
          isValid: false,
          tokenValid: true,
          reason: 'no_organizations',
          message: 'User is not a member of any GitHub organizations',
          missingScopes: [],
          userScopes: scopeCheck.userScopes,
        }
      }
    } catch {
      return {
        isValid: false,
        tokenValid: true,
        reason: 'org_access_denied',
        message: 'Cannot access GitHub organizations',
        missingScopes: [],
        userScopes: scopeCheck.userScopes,
      }
    }

    return {
      isValid: true,
      tokenValid: true,
      reason: 'valid',
      message: 'GitHub integration is valid and complete',
      missingScopes: [],
      userScopes: scopeCheck.userScopes,
    }
  },
}

