import type { Request } from 'express'
import type { Server } from 'socket.io'
import { Types } from 'mongoose'

type BoardIo = Server & {
  emitBoardEvent?: (boardId: string, event: string, payload: unknown) => void
  notifyWorkspace?: (workspaceId: string | Types.ObjectId, event: string, payload: unknown) => void
}

function asIo(req: Request) {
  return req.app.get('io') as BoardIo | undefined
}

function boardIdOf(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'object' && value !== null && 'board' in value) {
    const board = (value as { board?: unknown }).board
    if (typeof board === 'string' && board.trim()) return board
    if (board && typeof board === 'object' && '_id' in (board as object)) {
      return String((board as { _id: unknown })._id)
    }
  }
  return null
}

function workspaceIdOf(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string' && value.trim()) return value
  if (typeof value === 'object' && value !== null) {
    const obj = value as { workspace?: unknown; _id?: unknown; id?: unknown }
    if (typeof obj.workspace === 'string' && obj.workspace.trim()) return obj.workspace
    if (obj.workspace && typeof obj.workspace === 'object' && '_id' in (obj.workspace as object)) {
      return String((obj.workspace as { _id: unknown })._id)
    }
  }
  return null
}

/** Broadcast a board-room event after a successful REST mutation. */
export function emitBoardFromRequest(
  req: Request,
  boardId: string | null | undefined,
  event: string,
  payload: unknown,
) {
  if (!boardId) return
  const io = asIo(req)
  io?.emitBoardEvent?.(boardId, event, {
    ...(typeof payload === 'object' && payload !== null ? payload : { data: payload }),
    timestamp: new Date(),
  })
}

/** Broadcast a workspace-room event after a successful REST mutation. */
export function emitWorkspaceFromRequest(
  req: Request,
  workspaceId: string | null | undefined,
  event: string,
  payload: unknown,
) {
  if (!workspaceId) return
  const io = asIo(req)
  io?.notifyWorkspace?.(workspaceId, event, {
    ...(typeof payload === 'object' && payload !== null ? payload : { data: payload }),
    workspaceId,
    timestamp: new Date(),
  })
}

export function emitBoardTaskEvent(
  req: Request,
  event: 'task:created' | 'task:updated' | 'task:moved' | 'task:deleted',
  taskOrMeta: { board?: unknown; id?: string; taskId?: string },
  extra: Record<string, unknown> = {},
) {
  const boardId = boardIdOf(taskOrMeta) ?? (typeof extra.boardId === 'string' ? extra.boardId : null)
  if (!boardId) return

  if (event === 'task:deleted') {
    emitBoardFromRequest(req, boardId, event, {
      taskId: taskOrMeta.taskId ?? taskOrMeta.id,
      boardId,
      ...extra,
    })
    return
  }

  emitBoardFromRequest(req, boardId, event, {
    task: taskOrMeta,
    ...extra,
  })
}

export function resolveWorkspaceId(value: unknown) {
  return workspaceIdOf(value)
}

export async function emitUnreadCount(req: Request, userId: string) {
  const io = asIo(req) as any
  const ns = io?.of?.('/notifications')
  if (!ns) return
  const { Notification } = await import('../models/Notification.js')
  const count = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  })
  ns.to(`notifications:${userId}`).emit('notifications:unreadCount', { count })
}
