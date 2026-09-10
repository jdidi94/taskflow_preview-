import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import { taskService } from '../services/task.service.js'
import { listTasksQuerySchema, listAssignedTasksQuerySchema } from '../routes/validator/task.schemas.js'
import { emitBoardFromRequest, emitBoardTaskEvent } from '../sockets/emitHelpers.js'
import { param } from '../utils/params.js'

export const listTasks = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parsed = listTasksQuerySchema.safeParse(req.query)
  if (!parsed.success) throw parsed.error
  const data = await taskService.list(req.user!.sub, parsed.data)
  res.json({ success: true, data })
})

export const listAssignedUpcoming = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parsed = listAssignedTasksQuerySchema.safeParse(req.query)
  if (!parsed.success) throw parsed.error
  const data = await taskService.listAssignedUpcoming(req.user!.sub, parsed.data)
  res.json({ success: true, data })
})

export const getTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.getById(req.user!.sub, param(req, 'id'))
  res.json({ success: true, data })
})

export const createTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.create(req.user!.sub, req.body)
  emitBoardTaskEvent(req, 'task:created', data)
  res.status(201).json({ success: true, data })
})

export const updateTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.update(req.user!.sub, param(req, 'id'), req.body)
  emitBoardTaskEvent(req, 'task:updated', data)
  res.json({ success: true, data })
})

export const moveTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.move(req.user!.sub, param(req, 'id'), req.body)
  emitBoardTaskEvent(req, 'task:moved', data, {
    toColumnId: req.body.columnId,
    position: data.position,
  })
  res.json({ success: true, data })
})

export const deleteTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const taskId = param(req, 'id')
  const existing = await taskService.getById(req.user!.sub, taskId)
  await taskService.remove(req.user!.sub, taskId)
  emitBoardTaskEvent(req, 'task:deleted', {
    id: taskId,
    taskId,
    board: existing.board,
  })
  res.json({ success: true })
})

export const restoreTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.restore(req.user!.sub, param(req, 'id'), req.body)
  emitBoardTaskEvent(req, 'task:created', data)
  res.json({ success: true, data })
})

export const bulkUpdateTasks = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.bulkUpdate(req.user!.sub, req.body)
  for (const task of data) {
    emitBoardTaskEvent(req, 'task:updated', task)
  }
  res.json({ success: true, data })
})

export const duplicateTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.duplicate(req.user!.sub, param(req, 'id'))
  emitBoardTaskEvent(req, 'task:created', data)
  res.status(201).json({ success: true, data })
})

export const addComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.addComment(
    req.user!.sub,
    param(req, 'id'),
    req.body.body,
    req.body.attachments,
  )
  emitBoardFromRequest(req, String(data.board), 'comment:added', {
    task: data,
    taskId: data.id,
    comment: data.comments?.[data.comments.length - 1],
  })
  emitBoardTaskEvent(req, 'task:updated', data)
  res.status(201).json({ success: true, data })
})

export const updateComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.updateComment(
    req.user!.sub,
    param(req, 'id'),
    param(req, 'commentId'),
    req.body.body,
  )
  emitBoardTaskEvent(req, 'task:updated', data)
  res.json({ success: true, data })
})

export const deleteComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.deleteComment(
    req.user!.sub,
    param(req, 'id'),
    param(req, 'commentId'),
  )
  emitBoardTaskEvent(req, 'task:updated', data)
  res.json({ success: true, data })
})

export const addWatcher = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.addWatcher(req.user!.sub, param(req, 'id'), req.body.userId)
  emitBoardTaskEvent(req, 'task:updated', data)
  res.json({ success: true, data })
})

export const removeWatcher = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.removeWatcher(req.user!.sub, param(req, 'id'), param(req, 'userId'))
  emitBoardTaskEvent(req, 'task:updated', data)
  res.json({ success: true, data })
})

export const addDependency = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.addDependency(req.user!.sub, param(req, 'id'), {
    taskId: req.body.taskId,
    type: req.body.type,
  })
  emitBoardTaskEvent(req, 'task:updated', data)
  res.status(201).json({ success: true, data })
})

export const removeDependency = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.removeDependency(
    req.user!.sub,
    param(req, 'id'),
    param(req, 'dependencyId'),
  )
  emitBoardTaskEvent(req, 'task:updated', data)
  res.json({ success: true, data })
})
