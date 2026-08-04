import { useCallback, useEffect, useState } from 'react'

import { disconnectAiSocket, getAiSocket } from '@/lib/socket'

type SocketAck<T> = {
  success?: boolean
  data?: T
  error?: string
  details?: string
  message?: string
}

export type AiPlaceRef = {
  type: 'board' | 'space' | 'workspace'
  id: string
}

export type ProposedAgentTool = {
  id: string
  name: 'create_task' | 'move_task' | 'update_task' | 'add_comment'
  summary: string
  args: Record<string, unknown>
}

export type AssistantReply = {
  reply: string
  suggestions: string[]
  intent:
    | 'none'
    | 'generate_board'
    | 'templates'
    | 'suggestions'
    | 'summarize'
    | 'draft'
    | 'tools'
  boardPrompt: string | null
  placeLabel?: string | null
  toolCalls?: ProposedAgentTool[]
}

export type AgentToolResult = {
  id: string
  name: ProposedAgentTool['name']
  ok: boolean
  message: string
  taskId?: string
}

export type GeneratedBoard = {
  board?: { name?: string; description?: string }
  columns?: Array<{ name?: string }>
  tasks?: Array<{ title?: string; description?: string; priority?: string; column?: string }>
  tags?: Array<{ name?: string } | string>
}

export type SmartSuggestions = {
  boardTypes?: Array<{ name?: string; description?: string; type?: string }>
  templates?: Array<{ name?: string; description?: string; category?: string }>
  suggestions?: string[]
}

function waitForEvent<T>(
  event: string,
  errorEvent: string,
  emit: (socket: ReturnType<typeof getAiSocket>) => void,
  timeoutMs = 60000,
): Promise<T> {
  const socket = getAiSocket()
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup()
      reject(new Error('AI request timed out'))
    }, timeoutMs)

    const onOk = (payload: SocketAck<T> | T) => {
      cleanup()
      if (payload && typeof payload === 'object' && 'success' in payload) {
        const ack = payload as SocketAck<T>
        if (ack.success === false) {
          reject(new Error(ack.error || ack.details || 'AI request failed'))
          return
        }
        resolve((ack.data ?? payload) as T)
        return
      }
      resolve(payload as T)
    }

    const onFail = (payload: SocketAck<unknown>) => {
      cleanup()
      reject(new Error(payload?.error || payload?.details || 'AI request failed'))
    }

    function cleanup() {
      window.clearTimeout(timer)
      socket.off(event, onOk)
      socket.off(errorEvent, onFail)
    }

    socket.on(event, onOk)
    socket.on(errorEvent, onFail)
    emit(socket)
  })
}

export function useAiSocket() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let socket: ReturnType<typeof getAiSocket> | null = null
    try {
      socket = getAiSocket()
      setConnected(socket.connected)
      const onConnect = () => setConnected(true)
      const onDisconnect = () => setConnected(false)
      socket.on('connect', onConnect)
      socket.on('disconnect', onDisconnect)
      return () => {
        socket?.off('connect', onConnect)
        socket?.off('disconnect', onDisconnect)
      }
    } catch {
      setConnected(false)
      return undefined
    }
  }, [])

  const assistantChat = useCallback(
    (
      message: string,
      history: Array<{ role: 'user' | 'assistant'; content: string }>,
      place?: AiPlaceRef,
    ) =>
      waitForEvent<AssistantReply>('assistant_reply', 'assistant_error', (socket) => {
        socket.emit('assistant_chat', { message, history, place })
      }),
    [],
  )

  const confirmAgentTools = useCallback(
    (place: AiPlaceRef, tools: ProposedAgentTool[]) =>
      waitForEvent<{ results: AgentToolResult[]; placeLabel?: string }>(
        'agent_tools_result',
        'agent_tools_error',
        (socket) => {
          socket.emit('agent_confirm_tools', { place, tools })
        },
      ),
    [],
  )

  const generateBoard = useCallback(
    (prompt: string) =>
      waitForEvent<GeneratedBoard>('board_generated', 'board_generation_error', (socket) => {
        socket.emit('generate_board', {
          prompt,
          options: { includeChecklists: true, includeTags: true, moderateContent: true },
        })
      }, 90000),
    [],
  )

  const getSmartSuggestions = useCallback(
    (input: string) =>
      waitForEvent<SmartSuggestions>('smart_suggestions', 'smart_suggestions_error', (socket) => {
        socket.emit('get_smart_suggestions', { input, type: 'board' })
      }),
    [],
  )

  const getQuickTemplates = useCallback(
    (category = 'general') =>
      waitForEvent<Array<{ name?: string; description?: string; category?: string }>>(
        'quick_templates',
        'quick_templates_error',
        (socket) => {
          socket.emit('get_quick_templates', { category, count: 5 })
        },
      ),
    [],
  )

  return {
    connected,
    assistantChat,
    confirmAgentTools,
    generateBoard,
    getSmartSuggestions,
    getQuickTemplates,
    disconnect: disconnectAiSocket,
  }
}
