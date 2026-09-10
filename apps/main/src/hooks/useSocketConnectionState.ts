import { useEffect, useState } from 'react'

import {
  getSocketStatuses,
  subscribeSocketDiagnostics,
  type SocketNamespaceName,
} from '@/lib/socket'

export type ConnectionTone = 'live' | 'reconnecting' | 'offline'

const DEBOUNCE_MS = 1200

export function useSocketConnectionState(namespace: SocketNamespaceName = '/notifications'): ConnectionTone {
  const [tone, setTone] = useState<ConnectionTone>('live')

  useEffect(() => {
    let timer: number | null = null

    function read(): ConnectionTone {
      const status = getSocketStatuses().find((item) => item.namespace === namespace)
      if (!status || status.connected) return 'live'
      return status.lastError ? 'offline' : 'reconnecting'
    }

    function sync() {
      const next = read()
      if (next === 'live') {
        if (timer) {
          window.clearTimeout(timer)
          timer = null
        }
        setTone('live')
        return
      }
      if (timer) return
      timer = window.setTimeout(() => {
        timer = null
        setTone(read())
      }, DEBOUNCE_MS)
    }

    sync()
    const unsubscribe = subscribeSocketDiagnostics(sync)
    return () => {
      if (timer) window.clearTimeout(timer)
      unsubscribe()
    }
  }, [namespace])

  return tone
}
