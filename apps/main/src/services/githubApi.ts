import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery } from '@/services/apiBase'
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

export const githubApi = createApi({
  reducerPath: 'githubApi',
  baseQuery,
  tagTypes: ['GitHubStatus', 'GitHubOrgs', 'GitHubRepos'],
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
    syncGitHub: builder.mutation<ApiSuccess<{ lastSync: string; hasRequiredScopes: boolean }>, void>({
      query: () => ({
        url: '/github/sync',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'GitHubStatus', id: 'STATUS' }],
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
} = githubApi

export function getGitHubLinkRedirectUri() {
  const base = (import.meta.env.VITE_BASE_URL as string | undefined)?.replace(/\/$/, '') || window.location.origin
  return `${base}/auth/github-link-callback`
}

export function buildGitHubAuthorizeUrl(state: string) {
  const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined
  if (!clientId) {
    throw new Error('VITE_GITHUB_CLIENT_ID is not configured')
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
