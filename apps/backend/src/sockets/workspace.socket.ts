import type { Server, Socket } from 'socket.io'
import { Types } from 'mongoose'

import { User } from '../models/User.js'
import { Workspace, type IWorkspace } from '../models/Workspace.js'
import { workspaceService } from '../services/workspace.service.js'
import { AppError } from '../utils/AppError.js'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'

type WorkspaceSocket = Socket & {
  data: {
    user?: JwtPayload
    workspaceIdentity?: {
      id: string
      name: string
      email?: string
      avatar?: string | null
      isAdmin: boolean
    }
  }
}

type WorkspaceNamespace = ReturnType<Server['of']> & {
  joinWorkspace?: (socketId: string, workspaceId: string) => void
  leaveWorkspace?: (socketId: string, workspaceId: string) => void
}

type WorkspaceIo = Server & {
  notifyWorkspace?: (workspaceId: string | Types.ObjectId, event: string, payload: unknown) => void
  notifyWorkspaceAdmins?: (
    workspaceId: string | Types.ObjectId,
    event: string,
    payload: unknown,
  ) => Promise<void>
}

function roomId(workspaceId: string | Types.ObjectId) {
  return String(workspaceId)
}

function emitError(socket: WorkspaceSocket, message: string, code?: string) {
  socket.emit('error', code ? { code, message } : { message })
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof AppError) return error.message
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function extractWorkspaceId(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (payload && typeof payload === 'object' && 'workspaceId' in payload) {
    const value = (payload as { workspaceId?: unknown }).workspaceId
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

async function authenticateWorkspaceSocket(
  socket: WorkspaceSocket,
  next: (err?: Error) => void,
) {
  try {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (typeof socket.handshake.query?.token === 'string'
        ? socket.handshake.query.token
        : undefined) ||
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
      socket.data.workspaceIdentity = {
        id: decoded.sub,
        name: decoded.name ?? 'Admin',
        email: decoded.email,
        avatar: null,
        isAdmin: true,
      }
      next()
      return
    }

    const user = await User.findById(decoded.sub).lean()
    if (!user || !user.isActive) {
      next(new Error('User not found'))
      return
    }

    socket.data.workspaceIdentity = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? null,
      isAdmin: false,
    }
    next()
  } catch {
    next(new Error('Authentication failed'))
  }
}

function userCanAccessWorkspace(userId: string, workspace: IWorkspace, isAdmin: boolean) {
  if (isAdmin) return true
  return (
    String(workspace.owner) === userId ||
    workspace.members.some((member) => String(member.user) === userId)
  )
}

function userIsWorkspaceAdmin(userId: string, workspace: IWorkspace, isAdmin: boolean) {
  if (isAdmin) return true
  if (String(workspace.owner) === userId) return true
  return workspace.members.some(
    (member) => String(member.user) === userId && member.role === 'admin',
  )
}

async function loadAccessibleWorkspace(
  socket: WorkspaceSocket,
  workspaceId: string,
): Promise<{ ok: true; workspace: IWorkspace } | { ok: false; reason: string }> {
  if (!Types.ObjectId.isValid(workspaceId)) {
    return { ok: false, reason: 'Invalid workspace id' }
  }

  const workspace = await Workspace.findById(workspaceId)
  if (!workspace || !workspace.isActive) {
    return { ok: false, reason: 'Workspace not found' }
  }

  const identity = socket.data.workspaceIdentity
  const userId = socket.data.user?.sub
  if (!identity || !userId) {
    return { ok: false, reason: 'Authentication required' }
  }

  if (!userCanAccessWorkspace(userId, workspace, identity.isAdmin)) {
    return { ok: false, reason: 'Access denied to workspace' }
  }

  return { ok: true, workspace }
}

function publicUser(identity: NonNullable<WorkspaceSocket['data']['workspaceIdentity']>) {
  return {
    id: identity.id,
    name: identity.name,
    email: identity.email,
    avatar: identity.avatar ?? null,
  }
}

export function registerWorkspaceNamespace(io: Server) {
  const workspaceNamespace = io.of('/workspace') as WorkspaceNamespace
  workspaceNamespace.use(authenticateWorkspaceSocket)

  workspaceNamespace.on('connection', (socket: WorkspaceSocket) => {
    const identity = socket.data.workspaceIdentity
    const userId = socket.data.user?.sub
    if (!identity || !userId) {
      socket.disconnect()
      return
    }

    socket.join(`user:${userId}`)

    const joinWorkspaceRoom = async (payload: unknown) => {
      const workspaceId = extractWorkspaceId(payload)
      if (!workspaceId) {
        emitError(socket, 'workspaceId is required')
        return
      }

      try {
        const access = await loadAccessibleWorkspace(socket, workspaceId)
        if (!access.ok) {
          emitError(socket, access.reason)
          return
        }

        await socket.join(roomId(workspaceId))
        socket.emit('workspace_joined', { workspaceId, success: true })
        socket.to(roomId(workspaceId)).emit('workspace:user-joined', {
          workspaceId,
          user: publicUser(identity),
          timestamp: new Date(),
        })
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to join workspace'))
      }
    }

    const leaveWorkspaceRoom = async (payload: unknown) => {
      const workspaceId = extractWorkspaceId(payload)
      if (!workspaceId) {
        emitError(socket, 'workspaceId is required')
        return
      }

      await socket.leave(roomId(workspaceId))
      socket.to(roomId(workspaceId)).emit('workspace:user-left', {
        workspaceId,
        user: publicUser(identity),
        timestamp: new Date(),
      })
    }

    // Live web client events (v2 main app)
    socket.on('join_workspace', joinWorkspaceRoom)
    socket.on('leave_workspace', leaveWorkspaceRoom)

    // Colon-style events (mobile hooks / tests)
    socket.on('workspace:join', joinWorkspaceRoom)
    socket.on('workspace:leave', leaveWorkspaceRoom)

    socket.on('workspace_update', (data) => {
      const workspaceId = extractWorkspaceId(data)
      socket.emit('workspace_update_ack', {
        workspaceId,
        received: true,
        timestamp: new Date(),
        echo: data ?? null,
      })
    })

    socket.on('workspace:update', async (data: { workspaceId?: string; updates?: Record<string, unknown> }) => {
      const workspaceId = extractWorkspaceId(data)
      if (!workspaceId) {
        emitError(socket, 'workspaceId is required')
        return
      }

      try {
        const access = await loadAccessibleWorkspace(socket, workspaceId)
        if (!access.ok) {
          emitError(socket, access.reason)
          return
        }
        if (!userIsWorkspaceAdmin(userId, access.workspace, identity.isAdmin)) {
          emitError(socket, 'Admin access required')
          return
        }

        const updates = data?.updates ?? {}
        const updated = await workspaceService.update(access.workspace, {
          name: typeof updates.name === 'string' ? updates.name : undefined,
          description: typeof updates.description === 'string' ? updates.description : undefined,
          avatar:
            updates.avatar === null || typeof updates.avatar === 'string'
              ? (updates.avatar as string | null)
              : undefined,
        })

        workspaceNamespace.to(roomId(workspaceId)).emit('workspace:updated', {
          workspaceId,
          workspace: updated,
          updatedBy: publicUser(identity),
          timestamp: new Date(),
        })
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to update workspace'))
      }
    })

    socket.on(
      'workspace:member-update',
      async (data: {
        workspaceId?: string
        memberId?: string
        updates?: { role?: 'member' | 'admin' }
      }) => {
        const workspaceId = extractWorkspaceId(data)
        const memberId = typeof data?.memberId === 'string' ? data.memberId : null
        if (!workspaceId || !memberId) {
          emitError(socket, 'workspaceId and memberId are required')
          return
        }

        try {
          const access = await loadAccessibleWorkspace(socket, workspaceId)
          if (!access.ok) {
            emitError(socket, access.reason)
            return
          }
          if (!userIsWorkspaceAdmin(userId, access.workspace, identity.isAdmin)) {
            emitError(socket, 'Admin access required')
            return
          }

          const role = data.updates?.role
          if (role !== 'member' && role !== 'admin') {
            emitError(socket, 'Valid role update is required')
            return
          }

          await workspaceService.updateMemberRole(access.workspace, memberId, role)

          const payload = {
            workspaceId,
            memberId,
            updates: { role },
            updatedBy: publicUser(identity),
            timestamp: new Date(),
          }
          workspaceNamespace.to(roomId(workspaceId)).emit('workspace:member-updated', payload)
          workspaceNamespace.to(roomId(workspaceId)).emit('workspace:member_role_changed', payload)
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to update workspace member'))
        }
      },
    )

    socket.on(
      'workspace:update-member-role',
      async (data: { workspaceId?: string; userId?: string; newRole?: string }) => {
        const workspaceId = extractWorkspaceId(data)
        const memberId = typeof data?.userId === 'string' ? data.userId : null
        const role = data?.newRole === 'admin' || data?.newRole === 'member' ? data.newRole : null
        if (!workspaceId || !memberId || !role) {
          emitError(socket, 'workspaceId, userId, and newRole are required')
          return
        }

        try {
          const access = await loadAccessibleWorkspace(socket, workspaceId)
          if (!access.ok) {
            emitError(socket, access.reason)
            return
          }
          if (!userIsWorkspaceAdmin(userId, access.workspace, identity.isAdmin)) {
            emitError(socket, 'Admin access required')
            return
          }

          await workspaceService.updateMemberRole(access.workspace, memberId, role)
          const payload = {
            workspaceId,
            memberId,
            role,
            updatedBy: publicUser(identity),
            timestamp: new Date(),
          }
          workspaceNamespace.to(roomId(workspaceId)).emit('workspace:member_role_changed', payload)
          workspaceNamespace.to(roomId(workspaceId)).emit('workspace:member-updated', {
            ...payload,
            updates: { role },
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to update member role'))
        }
      },
    )

    socket.on(
      'workspace:remove-member',
      async (data: { workspaceId?: string; userId?: string }) => {
        const workspaceId = extractWorkspaceId(data)
        const memberId = typeof data?.userId === 'string' ? data.userId : null
        if (!workspaceId || !memberId) {
          emitError(socket, 'workspaceId and userId are required')
          return
        }

        try {
          const access = await loadAccessibleWorkspace(socket, workspaceId)
          if (!access.ok) {
            emitError(socket, access.reason)
            return
          }
          if (!userIsWorkspaceAdmin(userId, access.workspace, identity.isAdmin)) {
            emitError(socket, 'Admin access required')
            return
          }

          await workspaceService.removeMember(access.workspace, memberId)
          workspaceNamespace.to(roomId(workspaceId)).emit('workspace:member_removed', {
            workspaceId,
            memberId,
            removedBy: publicUser(identity),
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to remove workspace member'))
        }
      },
    )

    socket.on(
      'workspace:settings-update',
      async (data: { workspaceId?: string; settings?: Record<string, unknown> }) => {
        const workspaceId = extractWorkspaceId(data)
        if (!workspaceId) {
          emitError(socket, 'workspaceId is required')
          return
        }

        try {
          const access = await loadAccessibleWorkspace(socket, workspaceId)
          if (!access.ok) {
            emitError(socket, access.reason)
            return
          }
          if (!userIsWorkspaceAdmin(userId, access.workspace, identity.isAdmin)) {
            emitError(socket, 'Admin access required')
            return
          }

          // v3 Workspace has no settings subdocument; broadcast the payload for client sync.
          workspaceNamespace.to(roomId(workspaceId)).emit('workspace:settings-updated', {
            workspaceId,
            settings: data.settings ?? {},
            updatedBy: publicUser(identity),
            timestamp: new Date(),
          })
        } catch (error) {
          emitError(socket, errorMessage(error, 'Failed to update workspace settings'))
        }
      },
    )

    socket.on('workspace:get-members', async (data: { workspaceId?: string }) => {
      const workspaceId = extractWorkspaceId(data)
      if (!workspaceId) {
        emitError(socket, 'workspaceId is required')
        return
      }

      try {
        const access = await loadAccessibleWorkspace(socket, workspaceId)
        if (!access.ok) {
          emitError(socket, access.reason)
          return
        }

        const members = await workspaceService.listMembers(access.workspace)
        socket.emit('workspace:members', {
          workspaceId,
          ...members,
          timestamp: new Date(),
        })
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to get workspace members'))
      }
    })

    socket.on('workspace:check-limits', async (data: { workspaceId?: string }) => {
      const workspaceId = extractWorkspaceId(data)
      if (!workspaceId) {
        emitError(socket, 'workspaceId is required')
        return
      }

      try {
        const access = await loadAccessibleWorkspace(socket, workspaceId)
        if (!access.ok) {
          emitError(socket, access.reason)
          return
        }

        const membersCount = access.workspace.members.length
        const maxMembers = 100
        const warnings: Array<{ type: string; message: string; current: number; max: number }> = []

        if (membersCount / maxMembers >= 0.8) {
          warnings.push({
            type: 'members',
            message: 'Approaching workspace member limit',
            current: membersCount,
            max: maxMembers,
          })
        }

        socket.emit('workspace:limits', {
          workspaceId,
          usage: { membersCount },
          limits: { maxMembers },
          timestamp: new Date(),
        })

        if (warnings.length > 0) {
          socket.emit('workspace:limit-warnings', {
            workspaceId,
            warnings,
            timestamp: new Date(),
          })
        }
      } catch (error) {
        emitError(socket, errorMessage(error, 'Failed to check workspace limits'))
      }
    })

    socket.on('workspace:subscribe', async (data: { workspaceId?: string; eventTypes?: string[] }) => {
      const workspaceId = extractWorkspaceId(data)
      if (!workspaceId) {
        emitError(socket, 'workspaceId is required')
        return
      }

      const access = await loadAccessibleWorkspace(socket, workspaceId)
      if (!access.ok) {
        emitError(socket, access.reason)
        return
      }

      await socket.join(roomId(workspaceId))
      socket.emit('workspace:subscribed', {
        workspaceId,
        eventTypes: data.eventTypes ?? ['members', 'activity', 'updates'],
        timestamp: new Date(),
      })
    })

    socket.on('workspace:unsubscribe', async (data: { workspaceId?: string }) => {
      const workspaceId = extractWorkspaceId(data)
      if (!workspaceId) return
      await socket.leave(roomId(workspaceId))
      socket.emit('workspace:unsubscribed', { workspaceId, timestamp: new Date() })
    })

    socket.on('disconnect', () => {
      // Rooms are left automatically by Socket.IO.
    })
  })

  workspaceNamespace.joinWorkspace = (socketId, workspaceId) => {
    const target = workspaceNamespace.sockets.get(socketId)
    if (target) {
      void target.join(roomId(workspaceId))
    }
  }

  workspaceNamespace.leaveWorkspace = (socketId, workspaceId) => {
    const target = workspaceNamespace.sockets.get(socketId)
    if (target) {
      void target.leave(roomId(workspaceId))
    }
  }

  const typedIo = io as WorkspaceIo
  typedIo.notifyWorkspace = (workspaceId, event, payload) => {
    workspaceNamespace.to(roomId(workspaceId)).emit(event, payload)
  }

  typedIo.notifyWorkspaceAdmins = async (workspaceId, event, payload) => {
    const workspace = await Workspace.findById(workspaceId).lean()
    if (!workspace) return

    const adminIds = new Set<string>([String(workspace.owner)])
    for (const member of workspace.members) {
      if (member.role === 'admin') adminIds.add(String(member.user))
    }

    for (const adminId of adminIds) {
      workspaceNamespace.to(`user:${adminId}`).emit(event, payload)
    }
  }
}
