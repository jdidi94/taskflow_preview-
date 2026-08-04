import type { Server, Socket } from 'socket.io'
import { Types } from 'mongoose'

import { Board } from '../models/Board.js'
import { Space } from '../models/Space.js'
import { User } from '../models/User.js'
import { Workspace } from '../models/Workspace.js'
import { aiRealtimeService } from '../services/aiRealtime.service.js'
import { AppError } from '../utils/AppError.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'

type AiSocket = Socket & {
  data: {
    user?: JwtPayload
    aiIdentity?: {
      id: string
      name: string
      email?: string
      avatar?: string | null
    }
  }
}

type AiNamespace = ReturnType<Server['of']> & {
  notifyUser?: (userId: string, event: string, data: unknown) => void
  notifyBoard?: (boardId: string, event: string, data: unknown) => void
  broadcastToAll?: (event: string, data: unknown) => void
  getConnectedUsers?: () => Array<{ socketId: string; userId?: string }>
}

function emitError(socket: AiSocket, event: string, error: unknown, message = 'An error occurred') {
  socket.emit(event, {
    success: false,
    error: message,
    details: error instanceof Error ? error.message : error,
    timestamp: new Date().toISOString(),
  })
}

function emitSuccess(socket: AiSocket, event: string, data: unknown, message = 'Success') {
  socket.emit(event, {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  })
}

function isOverloadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return message.includes('overloaded') || message.includes('503') || message.includes('Service Unavailable')
}

async function authenticateAiSocket(socket: AiSocket, next: (err?: Error) => void) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined)

    if (!token) {
      next(new Error('Authentication token required'))
      return
    }

    const decoded = verifyAccessToken(token)
    socket.data.user = decoded

    if (decoded.type === 'admin') {
      socket.data.aiIdentity = {
        id: decoded.sub,
        name: decoded.name ?? 'Admin',
        email: decoded.email,
        avatar: null,
      }
      next()
      return
    }

    const user = await User.findById(decoded.sub).lean()
    if (!user || !user.isActive) {
      next(new Error('User not found'))
      return
    }

    socket.data.aiIdentity = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
    }
    next()
  } catch {
    next(new Error('Authentication failed'))
  }
}

async function userCanAccessBoard(userId: string, boardId: string, isAdminJwt: boolean) {
  if (isAdminJwt) {
    const board = await Board.findById(boardId)
    if (!board || !board.isActive) return { ok: false as const, reason: 'Board not found' }
    return { ok: true as const, board }
  }

  if (!Types.ObjectId.isValid(boardId)) return { ok: false as const, reason: 'Invalid board id' }

  const board = await Board.findById(boardId)
  if (!board || !board.isActive) return { ok: false as const, reason: 'Board not found' }

  const space = await Space.findById(board.space)
  const workspace = space ? await Workspace.findById(space.workspace) : null

  const hasAccess =
    (board.owner && String(board.owner) === userId) ||
    board.members.some((member) => String(member.user) === userId) ||
    (space ? space.members.some((member) => String(member.user) === userId) : false) ||
    (workspace
      ? String(workspace.owner) === userId ||
        workspace.members.some((member) => String(member.user) === userId)
      : false)

  if (!hasAccess) return { ok: false as const, reason: 'Access denied to board' }
  return { ok: true as const, board }
}

export function registerAiNamespace(io: Server) {
  const aiNamespace = io.of('/ai') as AiNamespace
  aiNamespace.use(authenticateAiSocket)

  aiNamespace.on('connection', (socket: AiSocket) => {
    const identity = socket.data.aiIdentity
    const userId = socket.data.user?.sub
    const isAdminJwt = socket.data.user?.type === 'admin'
    if (!identity || !userId) {
      socket.disconnect()
      return
    }

    socket.join(`user_${userId}`)

    emitSuccess(
      socket,
      'connected',
      {
        socketId: socket.id,
        userId,
        features: aiRealtimeService.getModelInfo().features,
      },
      'Connected to AI namespace',
    )

    socket.on('generate_board', async (data?: { prompt?: string; options?: Record<string, unknown> }) => {
      try {
        const prompt = data?.prompt
        if (!prompt || typeof prompt !== 'string') {
          emitError(socket, 'board_generation_error', new Error('Prompt is required'), 'Invalid prompt provided')
          return
        }

        socket.emit('board_generation_started', {
          prompt: `${prompt.slice(0, 100)}...`,
          timestamp: new Date().toISOString(),
        })

        const result = await aiRealtimeService.generateBoard(prompt, {
          maxTokens: typeof data?.options?.maxTokens === 'number' ? data.options.maxTokens : undefined,
          includeChecklists:
            typeof data?.options?.includeChecklists === 'boolean' ? data.options.includeChecklists : undefined,
          includeTags: typeof data?.options?.includeTags === 'boolean' ? data.options.includeTags : undefined,
          moderateContent:
            typeof data?.options?.moderateContent === 'boolean' ? data.options.moderateContent : undefined,
        })

        if (result.success) {
          emitSuccess(socket, 'board_generated', result.data, 'Board generated successfully')
        } else {
          emitError(socket, 'board_generation_error', new Error(result.errors.join(', ')), 'Board generation failed')
        }
      } catch (error) {
        if (isOverloadError(error)) {
          emitError(
            socket,
            'board_generation_error',
            new Error('AI service is temporarily overloaded. Please try again in a few minutes.'),
            'AI Service Overloaded',
          )
          return
        }
        emitError(socket, 'board_generation_error', error, 'Board generation failed')
      }
    })

    socket.on(
      'auto_complete_prompt',
      async (data?: { partialPrompt?: string; context?: Record<string, unknown> }) => {
        try {
          const partialPrompt = data?.partialPrompt
          if (!partialPrompt || typeof partialPrompt !== 'string') {
            emitError(socket, 'auto_complete_error', new Error('Partial prompt is required'), 'Invalid prompt provided')
            return
          }

          const suggestions = await aiRealtimeService.autoCompletePrompt(partialPrompt, data.context ?? {})
          emitSuccess(socket, 'auto_complete_suggestions', suggestions, 'Auto-completion suggestions generated')
        } catch (error) {
          emitError(socket, 'auto_complete_error', error, 'Auto-completion failed')
        }
      },
    )

    socket.on('get_smart_suggestions', async (data?: { input?: string; type?: string }) => {
      try {
        const input = data?.input
        if (!input || typeof input !== 'string') {
          emitError(socket, 'smart_suggestions_error', new Error('Input is required'), 'Invalid input provided')
          return
        }

        const suggestions = await aiRealtimeService.getSmartSuggestions(input, data.type ?? 'board')
        emitSuccess(socket, 'smart_suggestions', suggestions, 'Smart suggestions generated')
      } catch (error) {
        emitError(socket, 'smart_suggestions_error', error, 'Smart suggestions failed')
      }
    })

    socket.on('get_quick_templates', async (data?: { category?: string; count?: number }) => {
      try {
        const templates = await aiRealtimeService.generateQuickTemplates(
          data?.category ?? 'general',
          data?.count ?? 5,
        )
        emitSuccess(socket, 'quick_templates', templates, 'Quick templates generated')
      } catch (error) {
        emitError(socket, 'quick_templates_error', error, 'Quick templates failed')
      }
    })

    socket.on(
      'generate_additional_tasks',
      async (data?: { boardId?: string; columnName?: string; count?: number }) => {
        try {
          const { boardId, columnName, count = 3 } = data ?? {}
          if (!boardId || !columnName) {
            emitError(
              socket,
              'additional_tasks_error',
              new Error('Board ID and column name are required'),
              'Invalid parameters',
            )
            return
          }

          const access = await userCanAccessBoard(userId, boardId, Boolean(isAdminJwt))
          if (!access.ok) {
            emitError(socket, 'additional_tasks_error', new Error(access.reason), 'Permission denied')
            return
          }

          const tasks = await aiRealtimeService.generateAdditionalTasks(boardId, columnName, count)
          emitSuccess(socket, 'additional_tasks_generated', tasks, 'Additional tasks generated')
        } catch (error) {
          const message = error instanceof AppError ? error.message : 'Additional tasks generation failed'
          emitError(socket, 'additional_tasks_error', error, message)
        }
      },
    )

    socket.on('get_improvement_suggestions', async (data?: { boardId?: string }) => {
      try {
        const boardId = data?.boardId
        if (!boardId) {
          emitError(socket, 'improvement_suggestions_error', new Error('Board ID is required'), 'Invalid parameters')
          return
        }

        const access = await userCanAccessBoard(userId, boardId, Boolean(isAdminJwt))
        if (!access.ok) {
          emitError(socket, 'improvement_suggestions_error', new Error(access.reason), 'Permission denied')
          return
        }

        const suggestions = await aiRealtimeService.suggestImprovements(boardId)
        emitSuccess(socket, 'improvement_suggestions', suggestions, 'Improvement suggestions generated')
      } catch (error) {
        const message = error instanceof AppError ? error.message : 'Improvement suggestions failed'
        emitError(socket, 'improvement_suggestions_error', error, message)
      }
    })

    socket.on('moderate_content', async (data?: { text?: string }) => {
      try {
        const text = data?.text
        if (!text || typeof text !== 'string') {
          emitError(socket, 'content_moderation_error', new Error('Text is required'), 'Invalid text provided')
          return
        }

        const moderation = await aiRealtimeService.moderateContent(text)
        emitSuccess(socket, 'content_moderated', moderation, 'Content moderation completed')
      } catch (error) {
        emitError(socket, 'content_moderation_error', error, 'Content moderation failed')
      }
    })

    socket.on('get_model_info', () => {
      try {
        emitSuccess(socket, 'model_info', aiRealtimeService.getModelInfo(), 'Model information retrieved')
      } catch (error) {
        emitError(socket, 'model_info_error', error, 'Model info retrieval failed')
      }
    })

    socket.on('join_board_room', async (data?: { boardId?: string }) => {
      try {
        const boardId = data?.boardId
        if (!boardId) {
          emitError(socket, 'join_board_error', new Error('Board ID is required'), 'Invalid board ID')
          return
        }

        const access = await userCanAccessBoard(userId, boardId, Boolean(isAdminJwt))
        if (!access.ok) {
          emitError(socket, 'join_board_error', new Error(access.reason), 'Permission denied')
          return
        }

        await socket.join(`board_${boardId}`)
        emitSuccess(socket, 'joined_board_room', { boardId }, 'Joined board room')
      } catch (error) {
        emitError(socket, 'join_board_error', error, 'Failed to join board room')
      }
    })

    socket.on('leave_board_room', async (data?: { boardId?: string }) => {
      try {
        const boardId = data?.boardId
        if (boardId) {
          await socket.leave(`board_${boardId}`)
          emitSuccess(socket, 'left_board_room', { boardId }, 'Left board room')
          return
        }

        const rooms = [...socket.rooms].filter((room) => room.startsWith('board_'))
        await Promise.all(rooms.map((room) => socket.leave(room)))
        emitSuccess(socket, 'left_all_board_rooms', { rooms }, 'Left all board rooms')
      } catch (error) {
        emitError(socket, 'leave_board_error', error, 'Failed to leave board room')
      }
    })
  })

  aiNamespace.notifyUser = (targetUserId, event, data) => {
    aiNamespace.to(`user_${targetUserId}`).emit(event, data)
  }

  aiNamespace.notifyBoard = (boardId, event, data) => {
    aiNamespace.to(`board_${boardId}`).emit(event, data)
  }

  aiNamespace.broadcastToAll = (event, data) => {
    aiNamespace.emit(event, data)
  }

  aiNamespace.getConnectedUsers = () =>
    [...aiNamespace.sockets.values()].map((socket) => ({
      socketId: socket.id,
      userId: (socket as AiSocket).data.user?.sub,
    }))
}
