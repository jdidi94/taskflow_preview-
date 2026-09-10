/** Shareable board + open-task URL. */
export function taskBoardHref(boardId: string, taskId: string) {
  return `/boards/${encodeURIComponent(boardId)}?task=${encodeURIComponent(taskId)}`
}

export function plainMeta(meta: unknown): Record<string, unknown> {
  if (!meta) return {}
  if (meta instanceof Map) return Object.fromEntries(meta.entries())
  if (typeof meta === 'object') return meta as Record<string, unknown>
  return {}
}

export function metaString(meta: unknown, ...keys: string[]): string | null {
  const plain = plainMeta(meta)
  for (const key of keys) {
    const value = plain[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' || typeof value === 'bigint') return String(value)
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = value as { id?: unknown; _id?: unknown }
      const id = nested.id ?? nested._id
      if (id != null && String(id)) return String(id)
    }
  }
  return null
}
