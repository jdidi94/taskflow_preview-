import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'

import { getAccessToken, getOrCreateDeviceId } from '@/lib/authToken'

type AuthAwareState = {
  auth?: {
    token?: string | null
  }
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
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
