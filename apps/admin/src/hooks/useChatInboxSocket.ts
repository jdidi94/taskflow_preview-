import { useEffect, useRef, useState } from 'react'
import type { Socket } from 'socket.io-client'

import { disconnectChatSocket, getChatSocket, reconnectChatSocket } from '@/lib/chatSocket'
import type { ChatMessage, NewChatRequestPayload } from '@/types/chat'

export type ChatConnectionTone = 'live' | 'reconnecting' | 'offline'

type ChatInboxHandlers = {
  onNewRequest: (payload: NewChatRequestPayload) => void
  onMessage: (chatId: string, message: ChatMessage) => void
  onStatus: (chatId: string, status: string) => void
  onClosed: (chatId: string) => void
  onAccepted: (chatId: string) => void
  onTyping: (chatId: string, userId: string, isTyping: boolean) => void
  onPresence: (userId: string, isOnline: boolean) => void
}

export function useChatInboxSocket(handlers: ChatInboxHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const [tone, setTone] = useState<ChatConnectionTone>('reconnecting')

  useEffect(() => {
    let socket: Socket
    try {
      socket = getChatSocket()
    } catch {
      setTone('offline')
      return
    }

    function onConnect() {
      setTone('live')
    }

    function onDisconnect() {
      setTone('reconnecting')
    }

    function onConnectError() {
      setTone('offline')
    }

    function onNewRequest(payload: NewChatRequestPayload) {
      handlersRef.current.onNewRequest(payload)
    }

    function onMessage(payload: { chatId?: string; message?: ChatMessage }) {
      if (!payload?.message) return
      const chatId = String(payload.chatId ?? payload.message.chatId ?? '')
      if (!chatId) return
      handlersRef.current.onMessage(chatId, payload.message)
    }

    function onStatus(payload: { chatId?: string; status?: string }) {
      if (!payload?.chatId || !payload.status) return
      handlersRef.current.onStatus(String(payload.chatId), payload.status)
    }

    function onClosed(payload: { chatId?: string }) {
      if (!payload?.chatId) return
      handlersRef.current.onClosed(String(payload.chatId))
    }

    function onAccepted(payload: { chatId?: string }) {
      if (!payload?.chatId) return
      handlersRef.current.onAccepted(String(payload.chatId))
    }

    function onTyping(payload: { chatId?: string; user?: { id?: string }; isTyping?: boolean }) {
      if (!payload?.chatId || !payload.user?.id) return
      handlersRef.current.onTyping(String(payload.chatId), String(payload.user.id), Boolean(payload.isTyping))
    }

    function onPresence(payload: { user?: { id?: string; isOnline?: boolean } }) {
      if (!payload?.user?.id) return
      handlersRef.current.onPresence(String(payload.user.id), Boolean(payload.user.isOnline))
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)
    socket.on('admin:new-chat-request', onNewRequest)
    socket.on('admin:chat-accepted', onAccepted)
    socket.on('chat:message', onMessage)
    socket.on('chat:status-updated', onStatus)
    socket.on('chat:closed', onClosed)
    socket.on('chat:user-typing', onTyping)
    socket.on('chat:user-status', onPresence)

    if (socket.connected) onConnect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
      socket.off('admin:new-chat-request', onNewRequest)
      socket.off('admin:chat-accepted', onAccepted)
      socket.off('chat:message', onMessage)
      socket.off('chat:status-updated', onStatus)
      socket.off('chat:closed', onClosed)
      socket.off('chat:user-typing', onTyping)
      socket.off('chat:user-status', onPresence)
      disconnectChatSocket()
    }
  }, [])

  return {
    tone,
    reconnect: reconnectChatSocket,
    joinChat(chatId: string) {
      try {
        getChatSocket().emit('chat:join', { chatId })
      } catch {
        setTone('offline')
      }
    },
    leaveChat(chatId: string) {
      try {
        getChatSocket().emit('chat:leave', { chatId })
      } catch {
        // ignore
      }
    },
    sendTyping(chatId: string, isTyping: boolean) {
      try {
        getChatSocket().emit('chat:typing', { chatId, isTyping })
      } catch {
        // ignore
      }
    },
  }
}
