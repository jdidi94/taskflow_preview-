import type { MessageKey } from '@/i18n'
import type { StaffAdmin, StaffCreatedBy, StaffRole } from '@/types/staff'

export const STAFF_ROLES: StaffRole[] = ['super_admin', 'admin', 'moderator', 'viewer']

export const STAFF_USERNAME_RE = /^[a-zA-Z0-9_-]{3,50}$/
export const STAFF_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/

export function staffRoleMessageKey(role: StaffRole): MessageKey {
  if (role === 'super_admin') return 'users.roleSuper'
  if (role === 'moderator') return 'users.roleModerator'
  if (role === 'viewer') return 'users.roleViewer'
  return 'users.roleAdmin'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function normalizeCreatedBy(value: unknown): StaffCreatedBy {
  const record = asRecord(value)
  if (!record) return null
  const id = String(record.id ?? record._id ?? '')
  if (!id) return null
  return {
    id,
    userName: String(record.userName ?? ''),
    userEmail: String(record.userEmail ?? ''),
  }
}

export function normalizeStaff(raw: unknown): StaffAdmin {
  const record = asRecord(raw) ?? {}
  return {
    id: String(record.id ?? record._id ?? ''),
    userName: String(record.userName ?? ''),
    userEmail: String(record.userEmail ?? ''),
    role: (record.role as StaffRole) || 'admin',
    firstName: (record.firstName as string | null) ?? null,
    lastName: (record.lastName as string | null) ?? null,
    phoneNumber: (record.phoneNumber as string | null) ?? null,
    notes: (record.notes as string | null) ?? null,
    isActive: Boolean(record.isActive),
    isEmailVerified: Boolean(record.isEmailVerified),
    lastLoginAt: (record.lastLoginAt as string | null) ?? null,
    hasTwoFactorAuth: Boolean(record.hasTwoFactorAuth),
    createdAt: String(record.createdAt ?? ''),
    updatedAt: String(record.updatedAt ?? ''),
    createdBy: normalizeCreatedBy(record.createdBy),
  }
}

export function formatStaffName(staff: StaffAdmin) {
  const full = [staff.firstName, staff.lastName].filter(Boolean).join(' ').trim()
  return full || staff.userName
}
