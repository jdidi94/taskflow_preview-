import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/authToken'
import type { PublicAdmin } from '@/types/auth'

type AuthState = {
  token: string | null
  admin: PublicAdmin | null
  bootstrapped: boolean
}

const initialState: AuthState = {
  token: getAccessToken(),
  admin: null,
  bootstrapped: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; admin: PublicAdmin }>) {
      state.token = action.payload.token
      state.admin = action.payload.admin
      setAccessToken(action.payload.token)
    },
    setAdmin(state, action: PayloadAction<PublicAdmin | null>) {
      state.admin = action.payload
    },
    setBootstrapped(state, action: PayloadAction<boolean>) {
      state.bootstrapped = action.payload
    },
    logout(state) {
      state.token = null
      state.admin = null
      state.bootstrapped = true
      clearAccessToken()
    },
  },
})

export const { setCredentials, setAdmin, setBootstrapped, logout } = authSlice.actions
export const authReducer = authSlice.reducer
