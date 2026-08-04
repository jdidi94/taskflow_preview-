import type { Server, Socket } from 'socket.io'
import { Types } from 'mongoose'

import { Board } from '../models/Board.js'
import { Space } from '../models/Space.js'
import { Workspace } from '../models/Workspace.js'
import type { JwtPayload } from '../utils/jwt.js'

type PermissionSocket = Socket & {
  data: {
    user?: JwtPayload
  }
}

export type PermissionHelpers = {
  checkWorkspaceAccess: (userId: string, workspaceId: string) => Promise<boolean>
  checkSpaceAccess: (userId: string, spaceId: string) => Promise<boolean>
  checkBoardAccess: (userId: string, boardId: string) => Promise<boolean>
  joinWorkspace: (socket: PermissionSocket, workspaceId: string) => Promise<void>
  leaveWorkspace: (socket: PermissionSocket, workspaceId: string) => Promise<void>
  joinSpace: (socket: PermissionSocket, spaceId: string) => Promise<void>
  leaveSpace: (socket: PermissionSocket, spaceId: string) => Promise<void>
  joinBoard: (socket: PermissionSocket, boardId: string) => Promise<void>
  leaveBoard: (socket: PermissionSocket, boardId: string) => Promise<void>
  emitToWorkspace: (workspaceId: string, event: string, data: unknown) => void
  emitToSpace: (spaceId: string, event: string, data: unknown) => void
  emitToBoard: (boardId: string, event: string, data: unknown) => void
  emitToUser: (userId: string, event: string, data: unknown) => void
  getConnectedUserIds: () => string[]
}

type PermissionIo = Server & {
  permission?: PermissionHelpers
  emitToWorkspace?: PermissionHelpers['emitToWorkspace']
  emitToSpace?: PermissionHelpers['emitToSpace']
  emitToBoard?: PermissionHelpers['emitToBoard']
  emitToUser?: PermissionHelpers['emitToUser']
}

const AUTHENTICATED_NAMESPACES = ['/notifications', '/board', '/workspace', '/chat'] as const

function extractId(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    for (const key of ['workspaceId', 'spaceId', 'boardId', 'id']) {
      const value = record[key]
      if (typeof value === 'string' && value.trim()) return value.trim()
    }
  }
  return null
}

function socketUserId(socket: PermissionSocket) {
  return socket.data.user?.sub
}

function isAdminSocket(socket: PermissionSocket) {
  return socket.data.user?.type === 'admin'
}

async function checkWorkspaceAccess(userId: string, workspaceId: string, isAdmin = false) {
  if (isAdmin) return Types.ObjectId.isValid(workspaceId)
  if (!Types.ObjectId.isValid(workspaceId)) return false

  const workspace = await Workspace.findById(workspaceId).lean()
  if (!workspace || !workspace.isActive) return false

  return (
    String(workspace.owner) === userId ||
    workspace.members.some((member) => String(member.user) === userId)
  )
}

async function checkSpaceAccess(userId: string, spaceId: string, isAdmin = false) {
  if (isAdmin) return Types.ObjectId.isValid(spaceId)
  if (!Types.ObjectId.isValid(spaceId)) return false

  const space = await Space.findById(spaceId).lean()
  if (!space || !space.isActive) return false

  if (space.members.some((member) => String(member.user) === userId)) return true

  const workspace = await Workspace.findById(space.workspace).lean()
  if (!workspace || !workspace.isActive) return false

  return (
    String(workspace.owner) === userId ||
    workspace.members.some((member) => String(member.user) === userId)
  )
}

async function checkBoardAccess(userId: string, boardId: string, isAdmin = false) {
  if (isAdmin) return Types.ObjectId.isValid(boardId)
  if (!Types.ObjectId.isValid(boardId)) return false

  const board = await Board.findById(boardId).lean()
  if (!board || !board.isActive) return false

  if (
    (board.owner && String(board.owner) === userId) ||
    board.members.some((member) => String(member.user) === userId)
  ) {
    return true
  }

  const space = await Space.findById(board.space).lean()
  if (!space || !space.isActive) return false
  if (space.members.some((member) => String(member.user) === userId)) return true

  const workspace = await Workspace.findById(space.workspace).lean()
  if (!workspace || !workspace.isActive) return false

  return (
    String(workspace.owner) === userId ||
    workspace.members.some((member) => String(member.user) === userId)
  )
}

export function registerPermissionSocket(io: Server): PermissionHelpers {
  const userSockets = new Map<string, Set<string>>()
  const workspaceSockets = new Map<string, Set<string>>()

  const trackUserSocket = (userId: string, socketId: string) => {
    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    userSockets.get(userId)!.add(socketId)
  }

  const untrackUserSocket = (userId: string | undefined, socketId: string) => {
    if (!userId || !userSockets.has(userId)) return
    const set = userSockets.get(userId)!
    set.delete(socketId)
    if (set.size === 0) userSockets.delete(userId)
  }

  const joinWorkspace = async (socket: PermissionSocket, workspaceId: string) => {
    for (const room of socket.rooms) {
      if (room.startsWith('workspace:')) {
        await socket.leave(room)
      }
    }

    const roomName = `workspace:${workspaceId}`
    await socket.join(roomName)

    if (!workspaceSockets.has(workspaceId)) workspaceSockets.set(workspaceId, new Set())
    workspaceSockets.get(workspaceId)!.add(socket.id)

    const userId = socketUserId(socket)
    if (userId) trackUserSocket(userId, socket.id)
  }

  const leaveWorkspace = async (socket: PermissionSocket, workspaceId: string) => {
    await socket.leave(`workspace:${workspaceId}`)
    workspaceSockets.get(workspaceId)?.delete(socket.id)
    if (workspaceSockets.get(workspaceId)?.size === 0) workspaceSockets.delete(workspaceId)
  }

  const joinSpace = async (socket: PermissionSocket, spaceId: string) => {
    await socket.join(`space:${spaceId}`)
    const userId = socketUserId(socket)
    if (userId) trackUserSocket(userId, socket.id)
  }

  const leaveSpace = async (socket: PermissionSocket, spaceId: string) => {
    await socket.leave(`space:${spaceId}`)
  }

  const joinBoard = async (socket: PermissionSocket, boardId: string) => {
    await socket.join(`board:${boardId}`)
    const userId = socketUserId(socket)
    if (userId) trackUserSocket(userId, socket.id)
  }

  const leaveBoard = async (socket: PermissionSocket, boardId: string) => {
    await socket.leave(`board:${boardId}`)
  }

  const emitAcrossNamespaces = (roomName: string, event: string, data: unknown) => {
    for (const namespace of AUTHENTICATED_NAMESPACES) {
      io.of(namespace).to(roomName).emit(event, data)
    }
    // Also cover default namespace rooms if any clients joined there.
    io.to(roomName).emit(event, data)
  }

  const helpers: PermissionHelpers = {
    checkWorkspaceAccess: (userId, workspaceId) => checkWorkspaceAccess(userId, workspaceId),
    checkSpaceAccess: (userId, spaceId) => checkSpaceAccess(userId, spaceId),
    checkBoardAccess: (userId, boardId) => checkBoardAccess(userId, boardId),
    joinWorkspace,
    leaveWorkspace,
    joinSpace,
    leaveSpace,
    joinBoard,
    leaveBoard,
    emitToWorkspace: (workspaceId, event, data) => {
      emitAcrossNamespaces(`workspace:${workspaceId}`, event, data)
    },
    emitToSpace: (spaceId, event, data) => {
      emitAcrossNamespaces(`space:${spaceId}`, event, data)
    },
    emitToBoard: (boardId, event, data) => {
      emitAcrossNamespaces(`board:${boardId}`, event, data)
    },
    emitToUser: (userId, event, data) => {
      const sockets = userSockets.get(userId)
      if (!sockets) return
      for (const socketId of sockets) {
        for (const namespace of AUTHENTICATED_NAMESPACES) {
          io.of(namespace).to(socketId).emit(event, data)
        }
        io.to(socketId).emit(event, data)
      }
    },
    getConnectedUserIds: () => [...userSockets.keys()],
  }

  for (const namespace of AUTHENTICATED_NAMESPACES) {
    const nsp = io.of(namespace)

    nsp.on('connection', (socket: PermissionSocket) => {
      const userId = socketUserId(socket)
      if (userId) trackUserSocket(userId, socket.id)

      socket.on('join-workspace', async (payload) => {
        const workspaceId = extractId(payload)
        if (!workspaceId || !userId) {
          socket.emit('workspace-join-error', {
            workspaceId,
            error: 'workspaceId is required',
          })
          return
        }

        try {
          const canJoin = await checkWorkspaceAccess(userId, workspaceId, isAdminSocket(socket))
          if (!canJoin) {
            socket.emit('workspace-join-error', {
              workspaceId,
              error: 'Access denied to workspace',
            })
            return
          }

          await joinWorkspace(socket, workspaceId)
          socket.emit('workspace-joined', { workspaceId, success: true })
        } catch {
          socket.emit('workspace-join-error', {
            workspaceId,
            error: 'Failed to join workspace',
          })
        }
      })

      socket.on('leave-workspace', async (payload) => {
        const workspaceId = extractId(payload)
        if (!workspaceId) return
        await leaveWorkspace(socket, workspaceId)
        socket.emit('workspace-left', { workspaceId })
      })

      socket.on('join-space', async (payload) => {
        const spaceId = extractId(payload)
        if (!spaceId || !userId) {
          socket.emit('space-join-error', { spaceId, error: 'spaceId is required' })
          return
        }

        try {
          const canJoin = await checkSpaceAccess(userId, spaceId, isAdminSocket(socket))
          if (!canJoin) {
            socket.emit('space-join-error', { spaceId, error: 'Access denied to space' })
            return
          }

          await joinSpace(socket, spaceId)
          socket.emit('space-joined', { spaceId, success: true })
        } catch {
          socket.emit('space-join-error', { spaceId, error: 'Failed to join space' })
        }
      })

      socket.on('leave-space', async (payload) => {
        const spaceId = extractId(payload)
        if (!spaceId) return
        await leaveSpace(socket, spaceId)
        socket.emit('space-left', { spaceId })
      })

      socket.on('join-board', async (payload) => {
        const boardId = extractId(payload)
        if (!boardId || !userId) {
          socket.emit('board-join-error', { boardId, error: 'boardId is required' })
          return
        }

        try {
          const canJoin = await checkBoardAccess(userId, boardId, isAdminSocket(socket))
          if (!canJoin) {
            socket.emit('board-join-error', { boardId, error: 'Access denied to board' })
            return
          }

          await joinBoard(socket, boardId)
          socket.emit('board-joined', { boardId, success: true })
        } catch {
          socket.emit('board-join-error', { boardId, error: 'Failed to join board' })
        }
      })

      socket.on('leave-board', async (payload) => {
        const boardId = extractId(payload)
        if (!boardId) return
        await leaveBoard(socket, boardId)
        socket.emit('board-left', { boardId })
      })

      socket.on('disconnect', () => {
        untrackUserSocket(userId, socket.id)
        for (const [workspaceId, sockets] of workspaceSockets) {
          if (!sockets.has(socket.id)) continue
          sockets.delete(socket.id)
          if (sockets.size === 0) workspaceSockets.delete(workspaceId)
        }
      })
    })
  }

  const typedIo = io as PermissionIo
  typedIo.permission = helpers
  typedIo.emitToWorkspace = helpers.emitToWorkspace
  typedIo.emitToSpace = helpers.emitToSpace
  typedIo.emitToBoard = helpers.emitToBoard
  typedIo.emitToUser = helpers.emitToUser

  return helpers
}
