import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { clearAccessToken, getAccessToken, setAccessToken } from '@/lib/authToken'
import type { PublicUser } from '@/types/auth'

type AuthState = {
  token: string | null
  user: PublicUser | null
  bootstrapped: boolean
}

const initialState: AuthState = {
  token: getAccessToken(),
  user: null,
  bootstrapped: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ token: string; user: PublicUser }>,
    ) {
      state.token = action.payload.token
      state.user = action.payload.user
      setAccessToken(action.payload.token)
    },
    setUser(state, action: PayloadAction<PublicUser | null>) {
      state.user = action.payload
    },
    setBootstrapped(state, action: PayloadAction<boolean>) {
      state.bootstrapped = action.payload
    },
    logout(state) {
      state.token = null
      state.user = null
      state.bootstrapped = true
      clearAccessToken()
    },
  },
})

export const { setCredentials, setUser, setBootstrapped, logout } = authSlice.actions
export const authReducer = authSlice.reducer
