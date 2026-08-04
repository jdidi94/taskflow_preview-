const TOKEN_KEY = 'taskflow.auth.token'
const DEVICE_ID_KEY = 'taskflow.device.id'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY)
    if (existing) return existing
    const created =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(DEVICE_ID_KEY, created)
    return created
  } catch {
    return `device_${Date.now()}`
  }
}
