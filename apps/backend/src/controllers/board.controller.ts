import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import type { MembershipRequest } from '../middlewares/membership.js'
import { boardService } from '../services/board.service.js'
import { AppError } from '../utils/AppError.js'
import { param } from '../utils/params.js'

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
  res.status(201).json({ success: true, data })
})

export const updateBoard = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.update(req.board, req.body)
  res.json({ success: true, data })
})

export const archiveBoard = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.archive(req.board)
  res.json({ success: true, data })
})

export const listColumns = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.listColumns(req.board._id.toString())
  res.json({ success: true, data })
})

export const createColumn = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.createColumn(req.board._id.toString(), req.body)
  res.status(201).json({ success: true, data })
})

export const updateColumn = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.updateColumn(
    req.board._id.toString(),
    param(req, 'columnId'),
    req.body,
  )
  res.json({ success: true, data })
})

export const deleteColumn = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  await boardService.deleteColumn(req.board._id.toString(), param(req, 'columnId'))
  res.json({ success: true })
})

export const reorderColumns = asyncHandler(async (req: MembershipRequest, res: Response) => {
  if (!req.board) throw new AppError('Board not found', 404)
  const data = await boardService.reorderColumns(req.board._id.toString(), req.body.columnIds)
  res.json({ success: true, data })
})
