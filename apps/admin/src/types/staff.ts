import type { AdminRole } from '@/types/auth'

export type StaffRole = AdminRole

export type StaffCreatedBy = {
  id: string
  userName: string
  userEmail: string
} | null

export type StaffAdmin = {
  id: string
  userName: string
  userEmail: string
  role: StaffRole
  firstName: string | null
  lastName: string | null
  phoneNumber: string | null
  notes: string | null
  isActive: boolean
  isEmailVerified: boolean
  lastLoginAt: string | null
  hasTwoFactorAuth: boolean
  createdAt: string
  updatedAt: string
  createdBy: StaffCreatedBy
}

export type StaffStats = {
  total: number
  active: number
  inactive: number
  roleBreakdown: Record<string, number>
}

export type CreateStaffInput = {
  userName: string
  userEmail: string
  password: string
  role: StaffRole
  firstName?: string
  lastName?: string
  phoneNumber?: string
  notes?: string
}

export type UpdateStaffInput = {
  userName?: string
  userEmail?: string
  role?: StaffRole
  firstName?: string
  lastName?: string
  phoneNumber?: string
  notes?: string
  isActive?: boolean
}
