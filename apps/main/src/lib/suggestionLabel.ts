/** Coerce AI suggestion chips that may arrive as objects instead of strings. */
export function suggestionLabel(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (!value || typeof value !== 'object') return ''

  const record = value as Record<string, unknown>
  for (const key of ['title', 'text', 'prompt', 'label', 'message', 'summary', 'name', 'task']) {
    const candidate = record[key]
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }

  const title = typeof record.title === 'string' ? record.title.trim() : ''
  const description =
    typeof record.description === 'string'
      ? record.description.trim()
      : typeof record.detail === 'string'
        ? record.detail.trim()
        : ''
  if (title && description) return `${title}: ${description}`
  return title || description
}
