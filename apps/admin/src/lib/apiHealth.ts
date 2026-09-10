export type ApiHealthPayload = {
  status?: string
  mongo?: string
  version?: string
}

export type ApiHealthResult =
  | { ok: true; payload: ApiHealthPayload }
  | { ok: false; reason: 'unreachable' | 'degraded' }

function healthUrl() {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api'
  return `${base.replace(/\/$/, '')}/health`
}

/** Public GET /api/health — ok only when API responds and Mongo is up. */
export async function checkApiHealth(signal?: AbortSignal): Promise<ApiHealthResult> {
  try {
    const response = await fetch(healthUrl(), {
      method: 'GET',
      cache: 'no-store',
      signal,
    })
    let payload: ApiHealthPayload = {}
    try {
      payload = (await response.json()) as ApiHealthPayload
    } catch {
      payload = {}
    }
    const mongoUp = payload.mongo === 'up'
    const statusOk = payload.status === 'ok'
    if (response.ok && mongoUp && statusOk) {
      return { ok: true, payload }
    }
    return { ok: false, reason: 'degraded' }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}
