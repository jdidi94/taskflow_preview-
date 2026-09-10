function asId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    const record = value as { id?: unknown; _id?: unknown }
    return String(record.id ?? record._id ?? '')
  }
  return ''
}

export function destinationAfterInviteAccept(payload: unknown): string {
  const root =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data: unknown }).data
      : payload
  const record = root && typeof root === 'object' ? (root as Record<string, unknown>) : {}
  const invitation =
    record.invitation && typeof record.invitation === 'object'
      ? (record.invitation as Record<string, unknown>)
      : record
  const entity =
    record.entity && typeof record.entity === 'object'
      ? (record.entity as Record<string, unknown>)
      : null

  const type = String(invitation.type ?? invitation.targetEntity ?? '').toLowerCase()
  const target =
    invitation.targetEntity && typeof invitation.targetEntity === 'object'
      ? (invitation.targetEntity as Record<string, unknown>)
      : null
  const targetType = String(target?.type ?? type).toLowerCase()
  const targetId = asId(target?.id ?? invitation.targetEntityId ?? entity)

  if (targetType.includes('board') && targetId) return `/boards/${targetId}`
  if (targetType.includes('space') && targetId) return `/spaces/${targetId}`
  if (targetId) return `/workspaces/${targetId}`

  const entityId = asId(entity)
  if (entity && 'space' in entity && entityId) return `/boards/${entityId}`
  if (entity && 'workspace' in entity && entityId) return `/spaces/${entityId}`
  if (entityId) return `/workspaces/${entityId}`

  return '/dashboard'
}
