export function resolveAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null
  if (/^https?:\/\//i.test(avatar)) return avatar
  return avatar.startsWith('/') ? avatar : `/${avatar}`
}

export function initialsFromName(name: string | null | undefined, email?: string | null) {
  const source = name?.trim() || email?.trim() || '?'
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
}
