import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { getAccessToken, getOrCreateDeviceId } from '@/lib/authToken'

type AuthAwareState = {
  auth?: {
    token?: string | null
  }
}

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as AuthAwareState
    const token = state.auth?.token ?? getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    headers.set('x-device-id', getOrCreateDeviceId())
    return headers
  },
})

export const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => rawBaseQuery(args, api, extraOptions)

/** Shared RTK Query defaults — sockets/tags keep lists fresh; avoid focus thrash. */
export const rtkQueryDefaults = {
  keepUnusedDataFor: 60,
  refetchOnFocus: false as const,
  refetchOnReconnect: true as const,
}
