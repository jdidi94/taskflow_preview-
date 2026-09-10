import { createApi } from '@reduxjs/toolkit/query/react'

import { baseQuery, rtkQueryDefaults } from '@/services/apiBase'
import type { ApiSuccess } from '@/types/api'
import type { AuthRequires2FA, AuthSuccess, PublicAdmin } from '@/types/auth'

type MeResponse = ApiSuccess<{ admin: PublicAdmin }>

export const adminAuthApi = createApi({
  reducerPath: 'adminAuthApi',
  baseQuery,
  ...rtkQueryDefaults,
  tagTypes: ['Me', 'TwoFactor'],
  endpoints: (builder) => ({
    login: builder.mutation<
      AuthSuccess | AuthRequires2FA,
      { email: string; password: string; rememberMe?: boolean }
    >({
      query: (body) => ({ url: '/admin/auth/login', method: 'POST', body }),
    }),
    completeLogin2FA: builder.mutation<
      AuthSuccess,
      { userId: string; token: string; rememberMe?: boolean }
    >({
      query: (body) => ({ url: '/admin/auth/login/2fa-complete', method: 'POST', body }),
    }),
    setupStatus: builder.query<ApiSuccess<{ needsSetup: boolean }>, void>({
      query: () => '/admin/auth/setup-status',
    }),
    setupFirstAdmin: builder.mutation<
      AuthSuccess,
      { userName: string; userEmail: string; password: string }
    >({
      query: (body) => ({ url: '/admin/auth/setup-first-admin', method: 'POST', body }),
    }),
    logout: builder.mutation<{ success: true }, void>({
      query: () => ({ url: '/admin/auth/logout', method: 'POST' }),
    }),
    me: builder.query<MeResponse, void>({
      query: () => '/admin/auth/me',
      providesTags: ['Me'],
    }),
    changePassword: builder.mutation<
      { success: true; message?: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: '/admin/auth/change-password', method: 'POST', body }),
    }),
    uploadAvatar: builder.mutation<MeResponse, File>({
      query: (file) => {
        const body = new FormData()
        body.append('file', file)
        return { url: '/admin/auth/avatar', method: 'POST', body }
      },
      invalidatesTags: ['Me'],
    }),
    updateProfile: builder.mutation<
      MeResponse,
      {
        userName?: string
        firstName?: string | null
        lastName?: string | null
        phoneNumber?: string | null
        notes?: string | null
      }
    >({
      query: (body) => ({ url: '/admin/auth/profile', method: 'PUT', body }),
      invalidatesTags: ['Me'],
    }),
    get2FAStatus: builder.query<
      ApiSuccess<{ enabled: boolean; enabledAt: string | null; lastUsed: string | null }>,
      void
    >({
      query: () => '/admin/2fa/status',
      providesTags: ['TwoFactor'],
    }),
    enable2FA: builder.mutation<
      ApiSuccess<{ secret: string; otpauthUrl: string; qrCode: string }>,
      void
    >({
      query: () => ({ url: '/admin/2fa/enable', method: 'POST' }),
    }),
    verify2FASetup: builder.mutation<
      ApiSuccess<{ enabled: boolean; backupCodes: string[] }>,
      { token: string }
    >({
      query: (body) => ({ url: '/admin/2fa/verify-setup', method: 'POST', body }),
      invalidatesTags: ['TwoFactor', 'Me'],
    }),
    disable2FA: builder.mutation<
      { success: true; message?: string },
      { password: string; token?: string }
    >({
      query: (body) => ({ url: '/admin/2fa/disable', method: 'POST', body }),
      invalidatesTags: ['TwoFactor', 'Me'],
    }),
    generateBackupCodes: builder.mutation<ApiSuccess<{ backupCodes: string[] }>, void>({
      query: () => ({ url: '/admin/2fa/backup-codes', method: 'POST' }),
      invalidatesTags: ['TwoFactor'],
    }),
    generateRecoveryToken: builder.mutation<
      ApiSuccess<{ recoveryToken: string; expiresAt: string }>,
      void
    >({
      query: () => ({ url: '/admin/2fa/recovery-token', method: 'POST' }),
    }),
  }),
})

export const {
  useLoginMutation,
  useCompleteLogin2FAMutation,
  useSetupStatusQuery,
  useSetupFirstAdminMutation,
  useLogoutMutation,
  useMeQuery,
  useLazyMeQuery,
  useChangePasswordMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useGet2FAStatusQuery,
  useEnable2FAMutation,
  useVerify2FASetupMutation,
  useDisable2FAMutation,
  useGenerateBackupCodesMutation,
  useGenerateRecoveryTokenMutation,
} = adminAuthApi
