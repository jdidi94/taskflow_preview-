import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'

import { disconnectSystemSocket, getSystemSocket, reconnectSystemSocket } from '@/lib/systemSocket'
import type { ConnectionTone, SystemHealthDetail, SystemLiveStatus, SystemMetrics } from '@/types/health'

const DEBOUNCE_MS = 800

export function useSystemHealthLive() {
  const [tone, setTone] = useState<ConnectionTone>('reconnecting')
  const [liveStatus, setLiveStatus] = useState<SystemLiveStatus | null>(null)
  const [healthDetail, setHealthDetail] = useState<SystemHealthDetail | null>(null)
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [socketError, setSocketError] = useState<string | null>(null)

  useEffect(() => {
    let socket: Socket
    try {
      socket = getSystemSocket()
    } catch (error) {
      setTone('offline')
      setSocketError(error instanceof Error ? error.message : 'Socket unavailable')
      return
    }

    let debounce: number | null = null

    function markDisconnected(next: ConnectionTone, message?: string) {
      if (message) setSocketError(message)
      if (debounce) return
      debounce = window.setTimeout(() => {
        debounce = null
        setTone(next)
      }, DEBOUNCE_MS)
    }

    function requestSnapshot() {
      socket.emit('system:subscribe-monitoring', { interval: 10_000 })
      socket.emit('system:health-check')
      socket.emit('system:get-metrics', { metrics: ['cpu', 'memory'] })
    }

    function onConnect() {
      if (debounce) {
        window.clearTimeout(debounce)
        debounce = null
      }
      setTone('live')
      setSocketError(null)
      requestSnapshot()
    }

    function onDisconnect() {
      markDisconnected('reconnecting')
    }

    function onConnectError(error: Error) {
      markDisconnected('offline', error.message)
    }

    function onError(payload: unknown) {
      const message =
        payload && typeof payload === 'object' && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : 'Socket error'
      setSocketError(message)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('error', onError)
    socket.on('system:status', setLiveStatus)
    socket.on('system:status-update', setLiveStatus)
    socket.on('system:health-status', setHealthDetail)
    socket.on('system:metrics', setMetrics)

    if (socket.connected) onConnect()

    return () => {
      if (debounce) window.clearTimeout(debounce)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('error', onError)
      socket.off('system:status', setLiveStatus)
      socket.off('system:status-update', setLiveStatus)
      socket.off('system:health-status', setHealthDetail)
      socket.off('system:metrics', setMetrics)
      socket.emit('system:unsubscribe-monitoring')
      disconnectSystemSocket()
    }
  }, [])

  return {
    tone,
    liveStatus,
    healthDetail,
    metrics,
    socketError,
    reconnect: reconnectSystemSocket,
    refreshLive() {
      try {
        const socket = getSystemSocket()
        socket.emit('system:health-check')
        socket.emit('system:get-metrics', { metrics: ['cpu', 'memory'] })
      } catch {
        setTone('offline')
      }
    },
  }
}
