import type { Response } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import type { AuthedRequest } from '../middlewares/auth.js'
import { taskService } from '../services/task.service.js'
import { listTasksQuerySchema } from '../routes/validator/task.schemas.js'
import { param } from '../utils/params.js'

export const listTasks = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const parsed = listTasksQuerySchema.safeParse(req.query)
  if (!parsed.success) throw parsed.error
  const data = await taskService.list(req.user!.sub, parsed.data)
  res.json({ success: true, data })
})

export const getTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.getById(req.user!.sub, param(req, 'id'))
  res.json({ success: true, data })
})

export const createTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.create(req.user!.sub, req.body)
  res.status(201).json({ success: true, data })
})

export const updateTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.update(req.user!.sub, param(req, 'id'), req.body)
  res.json({ success: true, data })
})

export const moveTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.move(req.user!.sub, param(req, 'id'), req.body)
  res.json({ success: true, data })
})

export const deleteTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  await taskService.remove(req.user!.sub, param(req, 'id'))
  res.json({ success: true })
})

export const bulkUpdateTasks = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.bulkUpdate(req.user!.sub, req.body)
  res.json({ success: true, data })
})

export const duplicateTask = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.duplicate(req.user!.sub, param(req, 'id'))
  res.status(201).json({ success: true, data })
})

export const addComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.addComment(req.user!.sub, param(req, 'id'), req.body.body, req.body.attachments)
  res.status(201).json({ success: true, data })
})

export const updateComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.updateComment(
    req.user!.sub,
    param(req, 'id'),
    param(req, 'commentId'),
    req.body.body,
  )
  res.json({ success: true, data })
})

export const deleteComment = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.deleteComment(
    req.user!.sub,
    param(req, 'id'),
    param(req, 'commentId'),
  )
  res.json({ success: true, data })
})

export const addWatcher = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.addWatcher(req.user!.sub, param(req, 'id'), req.body.userId)
  res.json({ success: true, data })
})

export const removeWatcher = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.removeWatcher(req.user!.sub, param(req, 'id'), param(req, 'userId'))
  res.json({ success: true, data })
})

export const addDependency = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.addDependency(req.user!.sub, param(req, 'id'), {
    taskId: req.body.taskId,
    type: req.body.type,
  })
  res.status(201).json({ success: true, data })
})

export const removeDependency = asyncHandler(async (req: AuthedRequest, res: Response) => {
  const data = await taskService.removeDependency(
    req.user!.sub,
    param(req, 'id'),
    param(req, 'dependencyId'),
  )
  res.json({ success: true, data })
})
