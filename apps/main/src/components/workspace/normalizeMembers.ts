import type { WorkspaceMemberUser, WorkspaceMembersPayload } from '@/types/domain'

export type NormalizedWorkspaceMember = {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
  isOwner: boolean
}

function userId(user: string | WorkspaceMemberUser | null | undefined): string {
  if (!user) return ''
  if (typeof user === 'string') return user
  return String(user.id ?? user._id ?? '')
}

function userFields(user: string | WorkspaceMemberUser | null | undefined): {
  name: string
  email: string
  avatar?: string | null
} {
  if (!user || typeof user === 'string') {
    return { name: '', email: '' }
  }
  return {
    name: user.name?.trim() || user.email?.trim() || '',
    email: user.email?.trim() || '',
    avatar: user.avatar,
  }
}

/** Flatten owner + members for display. */
export function normalizeWorkspaceMembers(
  payload: WorkspaceMembersPayload | undefined,
): NormalizedWorkspaceMember[] {
  if (!payload) return []

  const rows: NormalizedWorkspaceMember[] = []
  const ownerId = userId(payload.owner)
  if (ownerId) {
    const fields = userFields(payload.owner)
    rows.push({
      id: ownerId,
      name: fields.name || fields.email || ownerId,
      email: fields.email,
      avatar: fields.avatar,
      role: 'owner',
      isOwner: true,
    })
  }

  for (const entry of payload.members ?? []) {
    const id = userId(entry.user)
    if (!id || id === ownerId) continue
    const fields = userFields(entry.user)
    rows.push({
      id,
      name: fields.name || fields.email || id,
      email: fields.email,
      avatar: fields.avatar,
      role: entry.role || 'member',
      isOwner: false,
    })
  }

  return rows
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}
