import { io, type Socket } from 'socket.io-client'

import { getAccessToken } from '@/lib/authToken'

let chatSocket: Socket | null = null

function socketBaseUrl() {
  const raw = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (!raw?.trim()) return undefined
  return raw.replace(/\/$/, '')
}

function namespaceUrl() {
  const base = socketBaseUrl()
  return base ? `${base}/chat` : '/chat'
}

export function getChatSocket() {
  const token = getAccessToken()
  if (!token) throw new Error('Authentication required for /chat socket')

  if (chatSocket?.connected) return chatSocket

  if (chatSocket) {
    chatSocket.auth = { token }
    chatSocket.connect()
    return chatSocket
  }

  chatSocket = io(namespaceUrl(), {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  return chatSocket
}

export function disconnectChatSocket() {
  if (!chatSocket) return
  chatSocket.disconnect()
  chatSocket = null
}

export function reconnectChatSocket() {
  try {
    const socket = getChatSocket()
    if (!socket.connected) {
      const token = getAccessToken()
      if (token) socket.auth = { token }
      socket.connect()
    }
  } catch {
    disconnectChatSocket()
  }
}
