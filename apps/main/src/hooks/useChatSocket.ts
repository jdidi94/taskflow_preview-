import { useEffect, useState } from 'react'

import { getChatSocket } from '@/lib/socket'
import { chatApi } from '@/services/chatApi'
import { useAppDispatch } from '@/store/hooks'
import { normalizeChatMessage, type ChatMessage } from '@/types/chat'

type UseChatSocketOptions = {
  onMessage?: (message: ChatMessage) => void
}

export function useChatSocket(chatId: string | undefined, options?: UseChatSocketOptions) {
  const dispatch = useAppDispatch()
  const [connected, setConnected] = useState(false)
  const onMessage = options?.onMessage

  useEffect(() => {
    if (!chatId) return

    let active = true
    const socket = getChatSocket()

    const onConnect = () => {
      if (!active) return
      setConnected(true)
      socket.emit('chat:join', { chatId })
    }

    const onDisconnect = () => {
      if (!active) return
      setConnected(false)
    }

    const handleMessage = (payload: { chatId?: string; message?: Record<string, unknown> }) => {
      if (!active || !payload.message) return
      if (payload.chatId && String(payload.chatId) !== chatId) return
      const message = normalizeChatMessage(payload.message)
      dispatch(
        chatApi.util.updateQueryData('getChatHistory', chatId, (draft) => {
          const exists = draft.data.messages.some((item) => item.id === message.id)
          if (!exists) draft.data.messages.push(message)
        }),
      )
      onMessage?.(message)
    }

    if (socket.connected) onConnect()
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('chat:message', handleMessage)

    return () => {
      active = false
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('chat:message', handleMessage)
      socket.emit('chat:leave', { chatId })
    }
  }, [chatId, dispatch, onMessage])

  return { connected }
}
