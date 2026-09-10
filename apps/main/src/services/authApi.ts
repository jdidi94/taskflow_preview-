import { createApi } from '@reduxjs/toolkit/query/react'

import { getOrCreateDeviceId } from '@/lib/authToken'
import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { AuthRequires2FA, AuthSuccess, PublicUser } from '@/types/auth'

type MeResponse = {
  success: true
  data: PublicUser & Record<string, unknown>
}

type TwoFactorStatusResponse = {
  success: true
  data: {
    enabled: boolean
    enabledAt: string | null
    lastUsed: string | null
    backupCodesRemaining: number
  }
}

type TwoFactorEnableResponse = {
  success: true
  data: {
    qrCode: string
    otpauthUrl: string
    secret: string
    backupCodes: string[]
    message?: string
  }
}

type TwoFactorMessageResponse = {
  success: true
  data: { message: string }
}

export type AuthSession = {
  sessionId: string
  deviceId: string
  deviceInfo: {
    type: 'web' | 'mobile' | 'desktop'
    os?: string
    browser?: string
    version?: string
    userAgent?: string
  }
  ipAddress: string
  loginAt: string
  lastActivityAt: string
  isCurrent: boolean
}

type SessionsResponse = {
  success: true
  data: AuthSession[]
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Me', 'TwoFactor', 'Sessions'],
  endpoints: (builder) => ({
    register: builder.mutation<
      AuthSuccess,
      { name: string; email: string; password: string }
    >({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body: {
          ...body,
          deviceId: getOrCreateDeviceId(),
          deviceInfo: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
            platform: 'web',
          },
        },
      }),
    }),
    login: builder.mutation<
      AuthSuccess | AuthRequires2FA,
      { email: string; password: string; rememberMe?: boolean }
    >({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body: {
          ...body,
          deviceId: getOrCreateDeviceId(),
          deviceInfo: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'web',
            platform: 'web',
          },
        },
      }),
    }),
    completeLogin2FA: builder.mutation<
      AuthSuccess,
      {
        userId: string
        sessionId: string
        token: string
        rememberMe?: boolean
        rememberDevice?: boolean
      }
    >({
      query: (body) => ({
        url: '/auth/login/2fa-complete',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<{ success: true }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    me: builder.query<MeResponse, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    updateProfile: builder.mutation<MeResponse, { name?: string; avatar?: string }>({
      query: (body) => ({
        url: '/auth/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    updatePreferences: builder.mutation<{ success: true; data: unknown }, Record<string, unknown>>({
      query: (body) => ({
        url: '/auth/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Me'],
    }),
    requestPasswordReset: builder.mutation<{ success: true }, { email: string }>({
      query: (body) => ({
        url: '/auth/password-reset/request',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<{ success: true }, { token: string; newPassword: string }>({
      query: (body) => ({
        url: '/auth/password-reset/confirm',
        method: 'PUT',
        body,
      }),
    }),
    changePassword: builder.mutation<
      { success: true },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
    }),
    get2FAStatus: builder.query<TwoFactorStatusResponse, void>({
      query: () => '/2fa/status',
      providesTags: ['TwoFactor'],
    }),
    enable2FA: builder.mutation<TwoFactorEnableResponse, void>({
      query: () => ({
        url: '/2fa/enable',
        method: 'POST',
        body: {},
      }),
    }),
    verify2FASetup: builder.mutation<TwoFactorMessageResponse, { token: string }>({
      query: (body) => ({
        url: '/2fa/verify-setup',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TwoFactor', 'Me'],
    }),
    disable2FA: builder.mutation<
      TwoFactorMessageResponse,
      { token?: string; recoveryToken?: string }
    >({
      query: (body) => ({
        url: '/2fa/disable',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TwoFactor', 'Me'],
    }),
    getSessions: builder.query<SessionsResponse, void>({
      query: () => '/auth/sessions',
      providesTags: ['Sessions'],
    }),
    endSession: builder.mutation<{ success: true }, { sessionId: string }>({
      query: ({ sessionId }) => ({
        url: `/auth/sessions/${encodeURIComponent(sessionId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Sessions', 'Me'],
    }),
  }),
})

export const {
  useRegisterMutation,
  useLoginMutation,
  useCompleteLogin2FAMutation,
  useLogoutMutation,
  useMeQuery,
  useLazyMeQuery,
  useUpdateProfileMutation,
  useUpdatePreferencesMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGet2FAStatusQuery,
  useEnable2FAMutation,
  useVerify2FASetupMutation,
  useDisable2FAMutation,
  useGetSessionsQuery,
  useEndSessionMutation,
} = authApi
