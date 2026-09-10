export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'viewer'

export type PublicAdmin = {
  id: string
  userId: string | null
  name: string
  email: string
  role: AdminRole
  avatar: string | null
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  notes: string | null
  isActive: boolean
  hasTwoFactorAuth: boolean
  lastActivity: string | null
  createdAt: string
  updatedAt: string
}

export type AuthSuccess = {
  success: true
  data: {
    admin: PublicAdmin
    token: string
    usedBackupCode?: boolean
  }
}

export type AuthRequires2FA = {
  success: true
  data: {
    requires2FA: true
    userId: string
    sessionId?: string
    message?: string
  }
}
