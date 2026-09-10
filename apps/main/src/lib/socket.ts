import { io, type Socket } from 'socket.io-client'

import { getAccessToken } from '@/lib/authToken'

export type SocketNamespaceName = '/board' | '/notifications' | '/chat' | '/ai' | '/workspace'

export type SocketNamespaceStatus = {
  namespace: SocketNamespaceName
  connected: boolean
  socketId: string | null
  lastError: string | null
}

const listeners = new Set<() => void>()
const statusByNs: Record<SocketNamespaceName, SocketNamespaceStatus> = {
  '/board': { namespace: '/board', connected: false, socketId: null, lastError: null },
  '/notifications': {
    namespace: '/notifications',
    connected: false,
    socketId: null,
    lastError: null,
  },
  '/chat': { namespace: '/chat', connected: false, socketId: null, lastError: null },
  '/ai': { namespace: '/ai', connected: false, socketId: null, lastError: null },
  '/workspace': { namespace: '/workspace', connected: false, socketId: null, lastError: null },
}

let boardSocket: Socket | null = null
let notificationSocket: Socket | null = null
let chatSocket: Socket | null = null
let aiSocket: Socket | null = null
let workspaceSocket: Socket | null = null

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeSocketDiagnostics(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getSocketStatuses(): SocketNamespaceStatus[] {
  return Object.values(statusByNs)
}

function socketBaseUrl() {
  const raw = import.meta.env.VITE_SOCKET_URL as string | undefined
  if (!raw || !raw.trim()) return undefined
  return raw.replace(/\/$/, '')
}

function namespaceUrl(namespace: SocketNamespaceName) {
  const base = socketBaseUrl()
  return base ? `${base}${namespace}` : namespace
}

function attachDiagnostics(socket: Socket, namespace: SocketNamespaceName) {
  if ((socket as Socket & { __tfDiagnostics?: boolean }).__tfDiagnostics) return
  ;(socket as Socket & { __tfDiagnostics?: boolean }).__tfDiagnostics = true

  const setStatus = (patch: Partial<SocketNamespaceStatus>) => {
    statusByNs[namespace] = { ...statusByNs[namespace], ...patch }
    notify()
  }

  socket.on('connect', () => {
    setStatus({ connected: true, socketId: socket.id ?? null, lastError: null })
  })

  socket.on('disconnect', () => {
    setStatus({ connected: false, socketId: null })
  })

  socket.on('connect_error', (err) => {
    const message = err?.message || 'Connection failed'
    setStatus({ connected: false, lastError: message })
  })

  socket.on('error', (payload) => {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : 'Socket error'
    setStatus({ lastError: message })
  })
}

function connectNamespace(existing: Socket | null, namespace: SocketNamespaceName): Socket {
  const token = getAccessToken()
  if (!token) {
    throw new Error(`Authentication required for ${namespace} socket`)
  }

  if (existing?.connected) {
    return existing
  }

  if (existing) {
    existing.auth = { token }
    existing.connect()
    return existing
  }

  const socket = io(namespaceUrl(namespace), {
    path: '/socket.io',
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  })
  attachDiagnostics(socket, namespace)
  return socket
}

export function getBoardSocket() {
  boardSocket = connectNamespace(boardSocket, '/board')
  return boardSocket
}

export function disconnectBoardSocket() {
  if (!boardSocket) return
  boardSocket.disconnect()
  boardSocket = null
}

export function getNotificationSocket() {
  notificationSocket = connectNamespace(notificationSocket, '/notifications')
  return notificationSocket
}

export function disconnectNotificationSocket() {
  if (!notificationSocket) return
  notificationSocket.disconnect()
  notificationSocket = null
}

export function getChatSocket() {
  chatSocket = connectNamespace(chatSocket, '/chat')
  return chatSocket
}

export function disconnectChatSocket() {
  if (!chatSocket) return
  chatSocket.disconnect()
  chatSocket = null
}

export function getAiSocket() {
  aiSocket = connectNamespace(aiSocket, '/ai')
  return aiSocket
}

export function disconnectAiSocket() {
  if (!aiSocket) return
  aiSocket.disconnect()
  aiSocket = null
}

export function getWorkspaceSocket() {
  workspaceSocket = connectNamespace(workspaceSocket, '/workspace')
  return workspaceSocket
}

export function disconnectWorkspaceSocket() {
  if (!workspaceSocket) return
  workspaceSocket.disconnect()
  workspaceSocket = null
}

export function reconnectAllSockets() {
  for (const getter of [
    getBoardSocket,
    getNotificationSocket,
    getChatSocket,
    getAiSocket,
    getWorkspaceSocket,
  ]) {
    try {
      const socket = getter()
      if (!socket.connected) {
        const token = getAccessToken()
        if (token) socket.auth = { token }
        socket.connect()
      }
    } catch {
      // ignore — namespace unavailable until auth/token ready
    }
  }
}
