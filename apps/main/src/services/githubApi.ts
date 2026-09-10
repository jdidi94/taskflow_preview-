import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/domain'

export type GitHubStatus = {
  linked: boolean
  tokenValid: boolean
  hasRequiredScopes: boolean
  missingScopes: string[]
  validation?: unknown
  github?: {
    username?: string | null
    email?: string | null
    avatar?: string | null
    scope?: string | null
    lastSync?: string | null
  } | null
}

export type GitHubOrg = {
  id: number
  login: string
  name: string
  description?: string | null
  url?: string
  htmlUrl?: string
  avatar?: string | null
  type?: string
}

export type GitHubRepo = {
  id: number
  name: string
  fullName: string
  description?: string | null
  htmlUrl?: string
  isPrivate?: boolean
  language?: string | null
  defaultBranch?: string
  updatedAt?: string
}

export type GitHubStatsOverview = {
  linkedOrg: boolean
  synced: boolean
  orgLogin: string | null
  syncedAt: string | null
  overview: {
    reposCount: number
    openPrs: number
    openIssues: number
    lastActivityAt: string | null
  } | null
}

export type GitHubStatsRepoRow = {
  id: number
  name: string
  fullName: string
  htmlUrl: string
  language: string | null
  stars: number
  forks: number
  openPrs: number
  openIssues: number
  pushedAt: string | null
  isPrivate: boolean
}

export type GitHubStatsRepos = {
  linkedOrg: boolean
  synced: boolean
  orgLogin: string | null
  syncedAt: string | null
  repositories: GitHubStatsRepoRow[]
}

export type GitHubPulseDay = {
  date: string
  commits: number
  prsMerged: number
  issuesClosed: number
}

export type GitHubStatsPulse = {
  linkedOrg: boolean
  synced: boolean
  orgLogin: string | null
  syncedAt: string | null
  days: 7 | 30
  pulse: {
    commits: number
    prsMerged: number
    issuesClosed: number
    series: GitHubPulseDay[]
  }
}

export const githubApi = createApi({
  reducerPath: 'githubApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['GitHubStatus', 'GitHubOrgs', 'GitHubRepos', 'GitHubStats'],
  endpoints: (builder) => ({
    getGitHubStatus: builder.query<ApiSuccess<GitHubStatus>, void>({
      query: () => '/github/status',
      providesTags: [{ type: 'GitHubStatus', id: 'STATUS' }],
    }),
    linkGitHub: builder.mutation<
      ApiSuccess<{ githubUsername: string; githubEmail?: string | null; scope: string }>,
      { code: string; redirectUri?: string }
    >({
      query: (body) => ({
        url: '/github/link',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'GitHubStatus', id: 'STATUS' },
        { type: 'GitHubOrgs', id: 'LIST' },
      ],
    }),
    syncGitHub: builder.mutation<
      ApiSuccess<{
        lastSync: string
        hasRequiredScopes: boolean
        orgLogin?: string
        overview?: GitHubStatsOverview['overview']
      }>,
      { workspaceId: string; force?: boolean }
    >({
      query: (body) => ({
        url: '/github/sync',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'GitHubStatus', id: 'STATUS' },
        { type: 'GitHubStats', id: arg.workspaceId },
      ],
    }),
    unlinkGitHub: builder.mutation<{ success: true }, void>({
      query: () => ({
        url: '/github/unlink',
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'GitHubStatus', id: 'STATUS' },
        { type: 'GitHubOrgs', id: 'LIST' },
        { type: 'GitHubRepos', id: 'LIST' },
        { type: 'GitHubStats', id: 'LIST' },
      ],
    }),
    forceGitHubReauth: builder.mutation<ApiSuccess<{ redirectUrl: string }>, void>({
      query: () => ({
        url: '/github/force-reauth',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'GitHubStatus', id: 'STATUS' },
        { type: 'GitHubOrgs', id: 'LIST' },
      ],
    }),
    listGitHubOrgs: builder.query<ApiSuccess<GitHubOrg[]>, void>({
      query: () => '/github/orgs',
      providesTags: [{ type: 'GitHubOrgs', id: 'LIST' }],
    }),
    listGitHubRepos: builder.query<
      ApiSuccess<{ organization: string; repositories: GitHubRepo[] }>,
      string
    >({
      query: (org) => `/github/orgs/${encodeURIComponent(org)}/repos`,
      providesTags: (_result, _error, org) => [{ type: 'GitHubRepos', id: org }],
    }),
    getGitHubStatsOverview: builder.query<ApiSuccess<GitHubStatsOverview>, string>({
      query: (workspaceId) => `/github/stats/overview?workspaceId=${encodeURIComponent(workspaceId)}`,
      providesTags: (_r, _e, workspaceId) => [{ type: 'GitHubStats', id: workspaceId }],
    }),
    getGitHubStatsRepos: builder.query<ApiSuccess<GitHubStatsRepos>, string>({
      query: (workspaceId) => `/github/stats/repos?workspaceId=${encodeURIComponent(workspaceId)}`,
      providesTags: (_r, _e, workspaceId) => [{ type: 'GitHubStats', id: workspaceId }],
    }),
    getGitHubStatsPulse: builder.query<
      ApiSuccess<GitHubStatsPulse>,
      { workspaceId: string; days: 7 | 30 }
    >({
      query: ({ workspaceId, days }) =>
        `/github/stats/pulse?workspaceId=${encodeURIComponent(workspaceId)}&days=${days}`,
      providesTags: (_r, _e, arg) => [{ type: 'GitHubStats', id: arg.workspaceId }],
    }),
  }),
})

export const {
  useGetGitHubStatusQuery,
  useLinkGitHubMutation,
  useSyncGitHubMutation,
  useUnlinkGitHubMutation,
  useForceGitHubReauthMutation,
  useListGitHubOrgsQuery,
  useLazyListGitHubOrgsQuery,
  useListGitHubReposQuery,
  useGetGitHubStatsOverviewQuery,
  useGetGitHubStatsReposQuery,
  useGetGitHubStatsPulseQuery,
} = githubApi

export function getGitHubLinkRedirectUri() {
  const configured = import.meta.env.VITE_GITHUB_LINK_CALLBACK_URL as string | undefined
  if (configured?.trim()) return configured.replace(/\/$/, '')
  const base =
    (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin
  return `${base}/auth/github-link-callback`
}

export function buildGitHubAuthorizeUrl(state: string) {
  const clientId = (import.meta.env.VITE_GITHUB_LINK_CLIENT_ID as string | undefined)?.trim()
  if (!clientId) {
    throw new Error('VITE_GITHUB_LINK_CLIENT_ID is not configured')
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGitHubLinkRedirectUri(),
    scope: 'user:email read:org repo',
    state,
    allow_signup: 'true',
  })
  return `https://github.com/login/oauth/authorize?${params.toString()}`
}
