import { io, type Socket } from 'socket.io-client'

import { getAccessToken } from '@/lib/authToken'

let systemSocket: Socket | null = null

function socketBaseUrl() {
  const raw = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (!raw?.trim()) return undefined
  return raw.replace(/\/$/, '')
}

function namespaceUrl() {
  const base = socketBaseUrl()
  return base ? `${base}/system` : '/system'
}

export function getSystemSocket() {
  const token = getAccessToken()
  if (!token) throw new Error('Authentication required for /system socket')

  if (systemSocket?.connected) return systemSocket

  if (systemSocket) {
    systemSocket.auth = { token }
    systemSocket.connect()
    return systemSocket
  }

  systemSocket = io(namespaceUrl(), {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  return systemSocket
}

export function disconnectSystemSocket() {
  if (!systemSocket) return
  systemSocket.disconnect()
  systemSocket = null
}

export function reconnectSystemSocket() {
  try {
    const socket = getSystemSocket()
    if (!socket.connected) {
      const token = getAccessToken()
      if (token) socket.auth = { token }
      socket.connect()
    }
  } catch {
    disconnectSystemSocket()
  }
}
