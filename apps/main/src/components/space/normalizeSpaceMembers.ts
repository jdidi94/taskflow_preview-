import type { SpaceMemberEntry } from '@/services/spacesApi'
import type { WorkspaceMemberUser } from '@/types/domain'

export type NormalizedSpaceMember = {
  id: string
  name: string
  email: string
  avatar?: string | null
  role: string
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

export function normalizeSpaceMembers(
  entries: SpaceMemberEntry[] | undefined,
): NormalizedSpaceMember[] {
  if (!entries) return []
  const rows: NormalizedSpaceMember[] = []
  for (const entry of entries) {
    const id = userId(entry.user)
    if (!id) continue
    const fields = userFields(entry.user)
    rows.push({
      id,
      name: fields.name || fields.email || id,
      email: fields.email,
      avatar: fields.avatar,
      role: entry.role || 'member',
    })
  }
  return rows
}
