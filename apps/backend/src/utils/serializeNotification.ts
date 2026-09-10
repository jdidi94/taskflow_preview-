/** Flatten Mongoose Map metadata so JSON / Socket.IO keep boardId + taskId. */
export function serializeNotification(doc: unknown) {
  const source = doc as {
    toObject?: (opts?: Record<string, unknown>) => Record<string, unknown>
  } | null
  const plain: Record<string, unknown> = source?.toObject
    ? source.toObject({ flattenMaps: true, virtuals: true })
    : { ...((doc as Record<string, unknown> | null) ?? {}) }

  let metadata: Record<string, unknown> = {}
  const rawMeta = plain.metadata
  if (rawMeta instanceof Map) {
    metadata = Object.fromEntries(rawMeta.entries())
  } else if (rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)) {
    metadata = { ...(rawMeta as Record<string, unknown>) }
  }

  const related = plain.relatedEntity as
    | { entityType?: string; entityId?: unknown }
    | null
    | undefined

  return {
    ...plain,
    id: String(plain.id ?? plain._id ?? ''),
    metadata,
    relatedEntity: related
      ? {
          entityType: String(related.entityType ?? ''),
          entityId: String(related.entityId ?? ''),
        }
      : null,
  }
}
