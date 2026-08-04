import fs from 'node:fs'
import type { Response } from 'express'
import { Types } from 'mongoose'

import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { fileService } from '../services/file.service.js'
import { Task } from '../models/Task.js'

function asObjectId(maybe: unknown): string | null {
  if (typeof maybe !== 'string') return null
  if (!Types.ObjectId.isValid(maybe)) return null
  return maybe
}

export const uploadAvatar = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded', 400)

  const uploadedBy = req.user!.sub as string
  const files = await fileService.createFilesFromUploads({
    uploadedBy,
    category: 'avatar',
    multerFiles: [req.file],
  })

  const file = files[0]
  res.status(201).json({ success: true, message: 'File uploaded successfully', data: { file } })
})

export const uploadTaskAttachments = asyncHandler(async (req: any, res: Response) => {
  const uploadedBy = req.user!.sub as string
  const multerFiles = (req.files as Express.Multer.File[] | undefined) ?? []
  if (multerFiles.length === 0) throw new AppError('No files uploaded', 400)

  const files = await fileService.createFilesFromUploads({
    uploadedBy,
    category: 'task_attachment',
    multerFiles,
  })

  // Optional linking: attach files to a task at upload time.
  const taskId = asObjectId(req.body?.taskId)
  if (taskId) {
    const task = await Task.findById(taskId)
    if (!task) throw new AppError('Task not found', 404)

    for (const f of files) {
      if (!task.attachments.some((id) => String(id) === String(f._id))) task.attachments.push(f._id)
    }
    await task.save()
  }

  res.status(201).json({
    success: true,
    message: `${files.length} files uploaded successfully`,
    data: { files, count: files.length },
  })
})

export const uploadCommentAttachments = asyncHandler(async (req: any, res: Response) => {
  const uploadedBy = req.user!.sub as string
  const multerFiles = (req.files as Express.Multer.File[] | undefined) ?? []
  if (multerFiles.length === 0) throw new AppError('No files uploaded', 400)

  const files = await fileService.createFilesFromUploads({
    uploadedBy,
    category: 'comment_attachment',
    multerFiles,
  })

  const taskId = asObjectId(req.body?.taskId)
  const commentId = asObjectId(req.body?.commentId)

  if (taskId && commentId) {
    const task = await Task.findById(taskId)
    if (!task) throw new AppError('Task not found', 404)

    const comment = task.comments.find((c) => String(c._id) === commentId)
    if (!comment) throw new AppError('Comment not found', 404)

    const attachmentIds = files.map((f) => f._id)
    for (const fId of attachmentIds) {
      if (!comment.attachments.some((id) => String(id) === String(fId))) comment.attachments.push(fId)
    }
    await task.save()
  }

  res.status(201).json({
    success: true,
    message: `${files.length} files uploaded successfully`,
    data: { files, count: files.length },
  })
})

export const uploadLogo = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded', 400)
  const uploadedBy = req.user!.sub as string
  const files = await fileService.createFilesFromUploads({
    uploadedBy,
    category: 'logo',
    multerFiles: [req.file],
  })
  res.status(201).json({ success: true, message: 'File uploaded successfully', data: { file: files[0] } })
})

export const uploadBoardBackground = asyncHandler(async (req: any, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded', 400)
  const uploadedBy = req.user!.sub as string
  const files = await fileService.createFilesFromUploads({
    uploadedBy,
    category: 'board_background',
    multerFiles: [req.file],
  })
  res.status(201).json({ success: true, message: 'File uploaded successfully', data: { file: files[0] } })
})

export const uploadGeneral = asyncHandler(async (req: any, res: Response) => {
  const uploadedBy = req.user!.sub as string
  const multerFiles = (req.files as Express.Multer.File[] | undefined) ?? []
  if (multerFiles.length === 0) throw new AppError('No files uploaded', 400)
  const files = await fileService.createFilesFromUploads({
    uploadedBy,
    category: 'general',
    multerFiles,
  })
  res.status(201).json({
    success: true,
    message: `${files.length} files uploaded successfully`,
    data: { files, count: files.length },
  })
})

export const listFiles = asyncHandler(async (req: any, res: Response) => {
  const parsed = req.validatedQuery as { page?: number; limit?: number; category?: any }
  const page = parsed?.page ?? 1
  const limit = parsed?.limit ?? 50
  const category = parsed?.category

  const data = await fileService.listUserFiles(req.user!.sub, { page, limit, category })
  res.json({ success: true, data })
})

export const getFile = asyncHandler(async (req: any, res: Response) => {
  const fileId = req.params.id
  const file = await fileService.getFileById(fileId)
  if (!file) throw new AppError('File not found', 404)
  await fileService.markDownloaded(file)
  res.json({ success: true, data: { file } })
})

export const downloadFile = asyncHandler(async (req: any, res: Response) => {
  const fileId = req.params.id
  const file = await fileService.getFileById(fileId)
  if (!file) throw new AppError('File not found', 404)

  try {
    await fs.promises.access(file.path)
  } catch {
    throw new AppError('File not found on server', 404)
  }

  await fileService.markDownloaded(file)

  res.setHeader('Content-Type', file.mimeType)
  res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`)

  fs.createReadStream(file.path).pipe(res)
})

export const deleteFile = asyncHandler(async (req: any, res: Response) => {
  const fileId = req.params.id
  const deleted = await fileService.deleteFileById(fileId, req.user!.sub)

  if (deleted === null) throw new AppError('File not found', 404)
  if (deleted === undefined) throw new AppError('Not authorized to delete this file', 403)

  res.json({ success: true, message: 'File deleted successfully' })
})

