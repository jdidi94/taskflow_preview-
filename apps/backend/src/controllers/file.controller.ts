import fs from 'node:fs'
import type { Response } from 'express'
import { Types } from 'mongoose'

import { env } from '../config/env.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { AppError } from '../utils/AppError.js'
import { fileService } from '../services/file.service.js'
import { googleDriveService } from '../services/googleDrive.service.js'
import { Task } from '../models/Task.js'
import { User } from '../models/User.js'

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

  await fileService.markDownloaded(file)

  if (file.source !== 'local') {
    const target = file.externalUrl || file.url
    if (!target) throw new AppError('External file URL missing', 404)
    res.redirect(target)
    return
  }

  try {
    await fs.promises.access(file.path)
  } catch {
    throw new AppError('File not found on server', 404)
  }

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

export const getDriveStatus = asyncHandler(async (req: any, res: Response) => {
  const configured = googleDriveService.isConfigured()
  const user = await User.findById(req.user!.sub).select('googleDrive')
  const linked = Boolean(user?.googleDrive?.linked)
  res.json({
    success: true,
    data: {
      configured,
      linked,
      tokenValid: Boolean(user?.googleDrive?.tokenValid),
      email: user?.googleDrive?.email ?? null,
      lastSync: user?.googleDrive?.lastSync ?? null,
      redirectUri: env.GOOGLE_DRIVE_REDIRECT_URI,
    },
  })
})

export const getDriveAuthUrl = asyncHandler(async (req: any, res: Response) => {
  const redirectUri =
    typeof req.query.redirectUri === 'string' && req.query.redirectUri
      ? req.query.redirectUri
      : env.GOOGLE_DRIVE_REDIRECT_URI
  const url = googleDriveService.buildAuthUrl(redirectUri, req.user!.sub)
  res.json({ success: true, data: { url, redirectUri } })
})

export const linkDriveAccount = asyncHandler(async (req: any, res: Response) => {
  const { code, redirectUri } = req.body as { code: string; redirectUri?: string }
  const uri = redirectUri || env.GOOGLE_DRIVE_REDIRECT_URI
  const tokens = await googleDriveService.exchangeCodeForTokens(code, uri)
  const email = await googleDriveService.getUserEmail(tokens.accessToken)

  const user = await User.findById(req.user!.sub).select('+googleDrive.accessToken +googleDrive.refreshToken')
  if (!user) throw new AppError('User not found', 404)

  user.googleDrive = {
    accessToken: googleDriveService.encryptToken(tokens.accessToken),
    refreshToken: tokens.refreshToken
      ? googleDriveService.encryptToken(tokens.refreshToken)
      : user.googleDrive?.refreshToken ?? null,
    expiryDate: new Date(Date.now() + tokens.expiresIn * 1000),
    email,
    scope: tokens.scope,
    linked: true,
    tokenValid: true,
    lastSync: new Date(),
  }
  await user.save()

  res.json({
    success: true,
    data: {
      linked: true,
      email,
      scope: tokens.scope,
    },
  })
})

export const unlinkDriveAccount = asyncHandler(async (req: any, res: Response) => {
  const user = await User.findById(req.user!.sub)
  if (!user) throw new AppError('User not found', 404)
  user.googleDrive = {
    accessToken: null,
    refreshToken: null,
    expiryDate: null,
    email: null,
    scope: null,
    linked: false,
    tokenValid: false,
    lastSync: null,
  }
  await user.save()
  res.json({ success: true, data: { linked: false } })
})

export const listDriveFiles = asyncHandler(async (req: any, res: Response) => {
  const { pageToken, q } = (req.validatedQuery ?? {}) as { pageToken?: string; q?: string }
  const accessToken = await googleDriveService.getValidAccessToken(req.user!.sub)
  const data = await googleDriveService.listFiles(accessToken, { pageToken, q })
  res.json({ success: true, data })
})

export const attachDriveFile = asyncHandler(async (req: any, res: Response) => {
  const body = req.body as {
    driveFileId: string
    taskId?: string
    category?: 'task_attachment' | 'comment_attachment' | 'general'
  }
  const accessToken = await googleDriveService.getValidAccessToken(req.user!.sub)
  const meta = await googleDriveService.getFileMeta(accessToken, body.driveFileId)
  const externalUrl =
    meta.webViewLink || `https://drive.google.com/file/d/${encodeURIComponent(meta.id)}/view`

  const file = await fileService.createExternalFile({
    uploadedBy: req.user!.sub,
    category: body.category ?? 'task_attachment',
    source: 'google_drive',
    originalName: meta.name,
    mimeType: meta.mimeType,
    size: meta.size,
    externalId: meta.id,
    externalUrl,
    providerMeta: {
      thumbnailLink: meta.thumbnailLink,
      iconLink: meta.iconLink,
      modifiedTime: meta.modifiedTime,
    },
  })

  if (body.taskId) {
    const task = await Task.findById(body.taskId)
    if (!task) throw new AppError('Task not found', 404)
    if (!task.attachments.some((id) => String(id) === String(file._id))) {
      task.attachments.push(file._id)
      await task.save()
    }
  }

  res.status(201).json({ success: true, data: { file } })
})

export const linkExternalFile = asyncHandler(async (req: any, res: Response) => {
  const body = req.body as {
    source: 'google_drive' | 'url'
    originalName: string
    mimeType: string
    size?: number
    externalId?: string
    externalUrl: string
    taskId?: string
    category?: 'task_attachment' | 'comment_attachment' | 'general'
    thumbnailLink?: string
    iconLink?: string
  }

  const file = await fileService.createExternalFile({
    uploadedBy: req.user!.sub,
    category: body.category ?? 'task_attachment',
    source: body.source,
    originalName: body.originalName,
    mimeType: body.mimeType,
    size: body.size,
    externalId: body.externalId ?? null,
    externalUrl: body.externalUrl,
    providerMeta: {
      thumbnailLink: body.thumbnailLink ?? null,
      iconLink: body.iconLink ?? null,
    },
  })

  if (body.taskId) {
    const task = await Task.findById(body.taskId)
    if (!task) throw new AppError('Task not found', 404)
    if (!task.attachments.some((id) => String(id) === String(file._id))) {
      task.attachments.push(file._id)
      await task.save()
    }
  }

  res.status(201).json({ success: true, data: { file } })
})

