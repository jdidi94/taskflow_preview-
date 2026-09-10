import { useCallback, useEffect, useRef, useState } from 'react'

import { checkApiHealth, type ApiHealthResult } from '@/lib/apiHealth'

export type ApiHealthPhase = 'checking' | 'healthy' | 'unhealthy'

const POLL_MS = 20_000

export function useApiHealth() {
  const [phase, setPhase] = useState<ApiHealthPhase>('checking')
  const [reason, setReason] = useState<Extract<ApiHealthResult, { ok: false }>['reason'] | null>(null)
  const [checking, setChecking] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setChecking(true)
    try {
      const result = await checkApiHealth(controller.signal)
      if (controller.signal.aborted) return
      if (result.ok === true) {
        setPhase('healthy')
        setReason(null)
        return
      }
      setPhase('unhealthy')
      setReason(result.reason)
    } finally {
      if (!controller.signal.aborted) setChecking(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const id = window.setInterval(() => {
      void refresh()
    }, POLL_MS)
    const onOnline = () => {
      void refresh()
    }
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('online', onOnline)
      abortRef.current?.abort()
    }
  }, [refresh])

  return { phase, reason, checking, refresh }
}
