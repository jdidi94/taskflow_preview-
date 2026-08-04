import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import type { MembershipRequest } from '../middlewares/membership.js'
import { Space } from '../models/Space.js'
import { boardService } from '../services/board.service.js'
import { emitBoardFromRequest, emitWorkspaceFromRequest } from '../sockets/emitHelpers.js'
import { AppError } from '../utils/AppError.js'
import { param } from '../utils/params.js'

async function workspaceIdForSpace(spaceId: string) {
  const space = await Space.findById(spaceId).select('workspace').lean()
  return space?.workspace ? String(space.workspace) : null
}

export const listBoardsBySpace = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await boardService.listBySpace(param(req, 'id'))
  res.json({ success: true, data })
})

export const getBoard = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.getById(req.board)
  res.json({ success: true, data })
})

export const createBoard = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await boardService.create(req.user!.sub, req.body)
  const spaceId = String(data.space)
  const workspaceId = await workspaceIdForSpace(spaceId)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:board_created', {
    board: data,
    spaceId,
    workspaceId,
    createdBy: req.user!.sub,
  })
  res.status(201).json({ success: true, data })
})

export const updateBoard = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const data = await boardService.update(req.board, req.body)
  emitBoardFromRequest(req, boardId, 'board:settings-updated', { board: data })
  const workspaceId = await workspaceIdForSpace(String(req.board.space))
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:board_updated', {
    board: data,
    spaceId: String(req.board.space),
    workspaceId,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const archiveBoard = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const spaceId = String(req.board.space)
  const data = await boardService.archive(req.board)
  emitBoardFromRequest(req, boardId, 'board:settings-updated', { board: data, archived: true })
  const workspaceId = await workspaceIdForSpace(spaceId)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:board_updated', {
    board: data,
    spaceId,
    workspaceId,
    archived: true,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const restoreBoard = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const spaceId = String(req.board.space)
  const data = await boardService.restore(req.board)
  emitBoardFromRequest(req, boardId, 'board:settings-updated', { board: data, archived: false })
  const workspaceId = await workspaceIdForSpace(spaceId)
  emitWorkspaceFromRequest(req, workspaceId, 'workspace:board_updated', {
    board: data,
    spaceId,
    workspaceId,
    archived: false,
    updatedBy: req.user!.sub,
  })
  res.json({ success: true, data })
})

export const listColumns = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.listColumns(req.board._id.toString())
  res.json({ success: true, data })
})

export const createColumn = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const data = await boardService.createColumn(boardId, req.body)
  emitBoardFromRequest(req, boardId, 'column:created', { column: data })
  res.status(201).json({ success: true, data })
})

export const updateColumn = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const data = await boardService.updateColumn(boardId, param(req, 'columnId'), req.body)
  emitBoardFromRequest(req, boardId, 'column:updated', { column: data })
  res.json({ success: true, data })
})

export const deleteColumn = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const columnId = param(req, 'columnId')
  await boardService.deleteColumn(boardId, columnId)
  emitBoardFromRequest(req, boardId, 'column:deleted', { columnId, boardId })
  res.json({ success: true })
})

export const reorderColumns = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const boardId = req.board._id.toString()
  const data = await boardService.reorderColumns(boardId, req.body.columnIds)
  emitBoardFromRequest(req, boardId, 'columns:reordered', {
    columns: data,
    columnOrder: data.map((column) => ({ columnId: column.id, position: column.position })),
  })
  res.json({ success: true, data })
})
