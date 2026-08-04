export type PublicUser = {
  id: string
  email: string
  name: string
  avatar: string | null
  isActive: boolean
  emailVerified: boolean
  lastLogin: string | null
}

export type AuthSuccess = {
  success: true
  token: string
  user: PublicUser
}

export type AuthRequires2FA = {
  success: true
  requires2FA: true
  userId: string
  sessionId: string
  rememberMe: boolean
  message?: string
}
