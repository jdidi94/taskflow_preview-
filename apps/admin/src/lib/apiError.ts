export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (!err || typeof err !== 'object') return fallback
  const data = 'data' in err ? (err as { data?: unknown }).data : undefined
  if (!data || typeof data !== 'object') return fallback

  const record = data as {
    message?: string
    error?: string
    details?: Array<{ message?: string; path?: string[] }> | Record<string, string>
  }

  if (Array.isArray(record.details) && record.details.length > 0) {
    const parts = record.details
      .map((item) => item.message)
      .filter((item): item is string => Boolean(item))
    if (parts.length) return parts.join(' · ')
  }

  if (record.details && !Array.isArray(record.details)) {
    const parts = Object.values(record.details).filter(Boolean)
    if (parts.length) return parts.join(' · ')
  }

  return record.message || record.error || fallback
}
