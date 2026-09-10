import type { Server, Socket } from 'socket.io'
import { Types } from 'mongoose'

import { Board } from '../models/Board.js'
import { Column } from '../models/Column.js'
import { Space } from '../models/Space.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'
import { Workspace } from '../models/Workspace.js'
import { boardService } from '../services/board.service.js'
import { taskService } from '../services/task.service.js'
import { AppError } from '../utils/AppError.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'

type BoardSocket = Socket & {
  data: {
    user?: JwtPayload
    boardIdentity?: {
      id: string
      name: string
      email?: string
      avatar?: string | null
      viewingTaskId?: string | null
    }
    joinedBoards?: Set<string>
  }
}

type BoardIo = Server & {
  emitBoardEvent?: (boardId: string, event: string, payload: unknown) => void
}

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'active'

function collectBoardPresence(boardNamespace: ReturnType<Server['of']>, boardId: string) {
  const room = boardNamespace.adapter.rooms.get(`board:${boardId}`)
  if (!room) {
    return [] as Array<{
      id: string
      name: string
      email?: string
      avatar?: string | null
      status: PresenceStatus
      viewingTaskId?: string | null
    }>
  }

  const users: Array<{
    id: string
    name: string
    email?: string
    avatar?: string | null
    status: PresenceStatus
    viewingTaskId?: string | null
  }> = []
  const seen = new Set<string>()

  for (const socketId of room) {
    const peer = boardNamespace.sockets.get(socketId) as BoardSocket | undefined
    const identity = peer?.data.boardIdentity
    if (!identity || seen.has(identity.id)) continue
    seen.add(identity.id)
    users.push({
      id: identity.id,
      name: identity.name,
      email: identity.email,
      avatar: identity.avatar ?? null,
      status: 'online',
      viewingTaskId: identity.viewingTaskId ?? null,
    })
  }

  return users
}

async function authenticateBoardSocket(socket: BoardSocket, next: (err?: Error) => void) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (typeof socket.handshake.headers.authorization === 'string'
        ? socket.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : undefined)

    if (!token) {
      next(new Error('Authentication required'))
      return
    }

    const decoded = verifyAccessToken(token)
    socket.data.user = decoded

    if (decoded.type === 'admin') {
      socket.data.boardIdentity = {
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

    socket.data.boardIdentity = {
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

async function userCanAccessBoard(userId: string, boardId: string) {
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
  return { ok: true as const, board, space, workspace }
}

function emitError(socket: BoardSocket, message: string, code?: string) {
  socket.emit('error', code ? { code, message } : { message })
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export function registerBoardNamespace(io: Server) {
  const boardNamespace = io.of('/board')
  boardNamespace.use(authenticateBoardSocket)

  boardNamespace.on('connection', (socket: BoardSocket) => {
    const identity = socket.data.boardIdentity
    const userId = socket.data.user?.sub
    if (!identity || !userId) {
      socket.disconnect()
      return
    }

    console.log(`[socket:/board] connected socket=${socket.id} user=${userId}`)
    socket.join(`user:${userId}`)
    socket.data.joinedBoards = new Set()

    socket.on('board:join', async (data: { boardId?: string }) => {
      try {
        const boardId = data?.boardId
        if (!boardId || typeof boardId !== 'string') {
          console.warn(`[socket:/board] join failed socket=${socket.id} reason=missing_boardId`)
          emitError(socket, 'Board ID is required and must be a string')
          return
        }

        const access = await userCanAccessBoard(userId, boardId)
        if (!access.ok) {
          console.warn(
            `[socket:/board] join denied socket=${socket.id} user=${userId} board=${boardId} reason=${access.reason}`,
          )
          emitError(socket, access.reason, access.reason.includes('Access') ? 'FORBIDDEN' : undefined)
          return
        }

        socket.join(`board:${boardId}`)
        socket.data.joinedBoards?.add(boardId)
        console.log(`[socket:/board] joined socket=${socket.id} user=${userId} board=${boardId}`)

        socket.to(`board:${boardId}`).emit('board:user-joined', {
          user: identity,
          boardId,
          status: 'online',
          timestamp: new Date(),
        })

        socket.emit('board:presence', {
          boardId,
          users: collectBoardPresence(boardNamespace, boardId),
          timestamp: new Date(),
        })

        const [columns, tasks] = await Promise.all([
          Column.find({ board: boardId, isActive: true }).sort({ position: 1 }).lean(),
          Task.find({ board: boardId, archived: false })
            .populate('assignees', 'name email avatar')
            .populate('reporter', 'name email avatar')
            .sort({ position: 1 })
            .lean(),
        ])

        socket.emit('board:state', {
          board: access.board.toObject(),
          columns,
          tasks,
          timestamp: new Date(),
        })
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to join board'))
      }
    })

    socket.on('board:leave', (data: { boardId?: string }) => {
      const boardId = data?.boardId
      if (!boardId) return
      socket.leave(`board:${boardId}`)
      socket.data.joinedBoards?.delete(boardId)
      socket.to(`board:${boardId}`).emit('board:user-left', {
        user: identity,
        boardId,
        timestamp: new Date(),
      })
    })

    socket.on(
      'column:create',
      async (data: { boardId?: string; columnData?: { name?: string; position?: number; limit?: number | null } }) => {
        try {
          const { boardId, columnData } = data ?? {}
          if (!boardId || !columnData?.name) {
            emitError(socket, 'Board ID and column name are required')
            return
          }

          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const column = await boardService.createColumn(boardId, {
            name: columnData.name,
            position: columnData.position,
            limit: columnData.limit,
          })

          boardNamespace.to(`board:${boardId}`).emit('column:created', {
            column,
            createdBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to create column'))
        }
      },
    )

    socket.on(
      'column:update',
      async (data: {
        columnId?: string
        boardId?: string
        updates?: { name?: string; position?: number; limit?: number | null }
      }) => {
        try {
          const { columnId, updates } = data ?? {}
          if (!columnId || !updates) {
            emitError(socket, 'Column ID and updates are required')
            return
          }

          const column = await Column.findById(columnId)
          if (!column || !column.isActive) {
            emitError(socket, 'Column not found')
            return
          }

          const boardId = String(column.board)
          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const updated = await boardService.updateColumn(boardId, columnId, updates)
          boardNamespace.to(`board:${boardId}`).emit('column:updated', {
            column: updated,
            updatedBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to update column'))
        }
      },
    )

    socket.on('column:delete', async (data: { columnId?: string }) => {
      try {
        const { columnId } = data ?? {}
        if (!columnId) {
          emitError(socket, 'Column ID is required')
          return
        }

        const column = await Column.findById(columnId)
        if (!column || !column.isActive) {
          emitError(socket, 'Column not found')
          return
        }

        const boardId = String(column.board)
        const access = await userCanAccessBoard(userId, boardId)
        if (!access.ok) {
          emitError(socket, access.reason, 'FORBIDDEN')
          return
        }

        await boardService.deleteColumn(boardId, columnId)
        boardNamespace.to(`board:${boardId}`).emit('column:deleted', {
          columnId,
          columnName: column.name,
          taskCount: column.taskIds.length,
          deletedBy: identity,
          timestamp: new Date(),
        })
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to delete column'))
      }
    })

    socket.on(
      'columns:reorder',
      async (data: { boardId?: string; columnOrder?: Array<{ columnId: string; position: number }> | string[] }) => {
        try {
          const { boardId, columnOrder } = data ?? {}
          if (!boardId || !columnOrder?.length) {
            emitError(socket, 'Board ID and columnOrder are required')
            return
          }

          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const columnIds = Array.isArray(columnOrder)
            ? typeof columnOrder[0] === 'string'
              ? (columnOrder as string[])
              : [...(columnOrder as Array<{ columnId: string; position: number }>)]
                  .sort((a, b) => a.position - b.position)
                  .map((entry) => entry.columnId)
            : []

          const columns = await boardService.reorderColumns(boardId, columnIds)
          boardNamespace.to(`board:${boardId}`).emit('columns:reordered', {
            columnOrder: columns.map((column) => ({ columnId: column.id, position: column.position })),
            columns,
            reorderedBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to reorder columns'))
        }
      },
    )

    socket.on(
      'task:create',
      async (data: {
        boardId?: string
        taskData?: {
          title?: string
          description?: string
          column?: string
          columnId?: string
          priority?: string
          status?: string
          color?: string
          assignees?: string[]
          tags?: string[]
          dueDate?: string | null
          position?: number
        }
      }) => {
        try {
          const { boardId, taskData } = data ?? {}
          const columnId = taskData?.columnId ?? taskData?.column
          if (!boardId || !taskData?.title || !columnId) {
            emitError(socket, 'Board ID, title, and column are required')
            return
          }

          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const task = await taskService.create(userId, {
            title: taskData.title,
            description: taskData.description,
            boardId,
            columnId,
            priority: (taskData.priority as any) ?? 'medium',
            status: (taskData.status as any) ?? 'todo',
            color: taskData.color,
            assignees: taskData.assignees,
            tags: taskData.tags,
            dueDate: taskData.dueDate,
            position: taskData.position,
          })

          boardNamespace.to(`board:${boardId}`).emit('task:created', {
            task,
            createdBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to create task'))
        }
      },
    )

    socket.on(
      'task:update',
      async (data: {
        taskId?: string
        boardId?: string
        updates?: Record<string, unknown>
      }) => {
        try {
          const { taskId, updates } = data ?? {}
          if (!taskId || !updates) {
            emitError(socket, 'Task ID and updates are required')
            return
          }

          const existing = await Task.findById(taskId)
          if (!existing || existing.archived) {
            emitError(socket, 'Task not found')
            return
          }

          const boardId = String(existing.board)
          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const task = await taskService.update(userId, taskId, updates as any)
          boardNamespace.to(`board:${boardId}`).emit('task:updated', {
            task,
            updatedBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to update task'))
        }
      },
    )

    socket.on(
      'task:move',
      async (data: { taskId?: string; boardId?: string; columnId?: string; position?: number }) => {
        try {
          const { taskId, columnId, position } = data ?? {}
          if (!taskId || !columnId || position === undefined) {
            emitError(socket, 'Task ID, columnId, and position are required')
            return
          }

          const existing = await Task.findById(taskId)
          if (!existing || existing.archived) {
            emitError(socket, 'Task not found')
            return
          }

          const boardId = String(existing.board)
          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const fromColumnId = String(existing.column)
          const task = await taskService.move(userId, taskId, { columnId, position })
          boardNamespace.to(`board:${boardId}`).emit('task:moved', {
            task,
            fromColumnId,
            toColumnId: columnId,
            position: task.position,
            movedBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to move task'))
        }
      },
    )

    socket.on('task:delete', async (data: { taskId?: string; boardId?: string }) => {
      try {
        const { taskId } = data ?? {}
        if (!taskId) {
          emitError(socket, 'Task ID is required')
          return
        }

        const existing = await Task.findById(taskId)
        if (!existing || existing.archived) {
          emitError(socket, 'Task not found')
          return
        }

        const boardId = String(existing.board)
        const access = await userCanAccessBoard(userId, boardId)
        if (!access.ok) {
          emitError(socket, access.reason, 'FORBIDDEN')
          return
        }

        await taskService.remove(userId, taskId)
        boardNamespace.to(`board:${boardId}`).emit('task:deleted', {
          taskId,
          boardId,
          deletedBy: identity,
          timestamp: new Date(),
        })
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to delete task'))
      }
    })

    socket.on(
      'comment:add',
      async (data: { taskId?: string; boardId?: string; body?: string; content?: string; attachments?: string[] }) => {
        try {
          const { taskId, attachments } = data ?? {}
          const body = data?.body ?? data?.content
          if (!taskId || !body) {
            emitError(socket, 'Task ID and comment body are required')
            return
          }

          const existing = await Task.findById(taskId)
          if (!existing || existing.archived) {
            emitError(socket, 'Task not found')
            return
          }

          const boardId = String(existing.board)
          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const task = await taskService.addComment(userId, taskId, body, attachments)
          boardNamespace.to(`board:${boardId}`).emit('comment:added', {
            task,
            taskId,
            comment: task.comments[task.comments.length - 1],
            createdBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to add comment'))
        }
      },
    )

    socket.on(
      'board:settings-update',
      async (data: {
        boardId?: string
        updates?: { name?: string; description?: string; type?: string; visibility?: string }
      }) => {
        try {
          const { boardId, updates } = data ?? {}
          if (!boardId || !updates) {
            emitError(socket, 'Board ID and updates are required')
            return
          }

          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const board = await boardService.update(access.board, updates as any)
          boardNamespace.to(`board:${boardId}`).emit('board:settings-updated', {
            board,
            updatedBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to update board settings'))
        }
      },
    )

    socket.on('board:view', (data: { boardId?: string; taskId?: string | null }) => {
      const boardId = data?.boardId
      if (!boardId) return
      if (data.taskId !== undefined) identity.viewingTaskId = data.taskId || null
      socket.to(`board:${boardId}`).emit('board:viewer', {
        user: { ...identity, viewingTaskId: identity.viewingTaskId ?? null },
        boardId,
        viewingTaskId: identity.viewingTaskId ?? null,
        timestamp: new Date(),
      })
    })

    socket.on(
      'board:bulk-operation',
      async (data: {
        boardId?: string
        taskIds?: string[]
        updates?: Record<string, unknown>
      }) => {
        try {
          const { boardId, taskIds, updates } = data ?? {}
          if (!boardId || !taskIds?.length || !updates) {
            emitError(socket, 'Board ID, taskIds, and updates are required')
            return
          }

          const access = await userCanAccessBoard(userId, boardId)
          if (!access.ok) {
            emitError(socket, access.reason, 'FORBIDDEN')
            return
          }

          const tasks = await taskService.bulkUpdate(userId, {
            taskIds,
            updates: updates as any,
          })

          boardNamespace.to(`board:${boardId}`).emit('board:bulk-operation-completed', {
            boardId,
            tasks,
            updatedBy: identity,
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to run bulk operation'))
        }
      },
    )

    // Board-level tags are not modeled in v3; keep event handlers for client compatibility.
    socket.on('board:tag:create', () => {
      emitError(socket, 'Board tags are not supported in v3; use task tags instead')
    })
    socket.on('board:tag:update', () => {
      emitError(socket, 'Board tags are not supported in v3; use task tags instead')
    })
    socket.on('board:tag:delete', () => {
      emitError(socket, 'Board tags are not supported in v3; use task tags instead')
    })

    socket.on('typing:start', (data: { boardId?: string; taskId?: string }) => {
      const boardId = data?.boardId
      if (!boardId) return
      socket.to(`board:${boardId}`).emit('typing:start', {
        user: identity,
        boardId,
        taskId: data.taskId ?? null,
        timestamp: new Date(),
      })
    })

    socket.on('typing:stop', (data: { boardId?: string; taskId?: string }) => {
      const boardId = data?.boardId
      if (!boardId) return
      socket.to(`board:${boardId}`).emit('typing:stop', {
        user: identity,
        boardId,
        taskId: data.taskId ?? null,
        timestamp: new Date(),
      })
    })

    socket.on('presence:update', (data: { boardId?: string; status?: string; taskId?: string | null }) => {
      const boardId = data?.boardId
      if (!boardId) return
      if (data.taskId !== undefined) identity.viewingTaskId = data.taskId || null
      const status = (data.status ?? 'online') as PresenceStatus
      socket.to(`board:${boardId}`).emit('presence:update', {
        user: { ...identity, viewingTaskId: identity.viewingTaskId ?? null },
        boardId,
        status,
        viewingTaskId: identity.viewingTaskId ?? null,
        timestamp: new Date(),
      })
      boardNamespace.to(`board:${boardId}`).emit('board:presence', {
        boardId,
        users: collectBoardPresence(boardNamespace, boardId),
        timestamp: new Date(),
      })
    })

    socket.on('disconnect', (reason) => {
      console.log(`[socket:/board] disconnected socket=${socket.id} user=${userId} reason=${reason}`)
      const boards = socket.data.joinedBoards
      if (!boards?.size) return
      for (const boardId of boards) {
        socket.to(`board:${boardId}`).emit('board:user-left', {
          user: identity,
          boardId,
          timestamp: new Date(),
        })
      }
      boards.clear()
    })
  })

  const typedIo = io as BoardIo
  typedIo.emitBoardEvent = (boardId: string, event: string, payload: unknown) => {
    boardNamespace.to(`board:${boardId}`).emit(event, payload)
  }
}
