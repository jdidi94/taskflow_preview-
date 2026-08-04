import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'
import type { NextFunction, Request, RequestHandler, Response } from 'express'

import { AppError } from '../utils/AppError.js'
import { UPLOAD_ROOT, fileTypeConfigs } from '../config/fileUpload.js'
import type { FileCategory } from '../models/File.js'

function inferMimeTypeFromExtension(originalName: string): string | null {
  const ext = path.extname(originalName).toLowerCase()
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.pdf':
      return 'application/pdf'
    case '.doc':
      return 'application/msword'
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.xls':
      return 'application/vnd.ms-excel'
    case '.xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case '.txt':
      return 'text/plain'
    case '.zip':
      return 'application/zip'
    default:
      return null
  }
}

function isAllowedFileType(mimeType: string, allowedMimeTypes: string[]): boolean {
  // Exact matches only (we keep configs explicit in v3).
  return allowedMimeTypes.includes(mimeType)
}

function createMulter(category: FileCategory): multer.Multer {
  const config = fileTypeConfigs[category]

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        const dir = path.join(UPLOAD_ROOT, config.folder)
        try {
          fs.mkdirSync(dir, { recursive: true })
          cb(null, dir)
        } catch (err) {
          cb(err as Error, dir)
        }
      },
      filename: (req, file, cb) => {
        const userId = (req as any).user?.sub ?? (req as any).user?.id ?? 'anon'
        const ext = path.extname(file.originalname || file.originalname).toLowerCase()
        const timestamp = Date.now()
        const randomId = crypto.randomBytes(6).toString('hex')
        cb(null, `${category}_${userId}_${timestamp}_${randomId}${ext}`)
      },
    }),
    limits: {
      fileSize: config.maxFileSize,
    },
    fileFilter: (req, file, cb) => {
      const provided = file.mimetype
      const inferred = inferMimeTypeFromExtension(file.originalname)
      const candidates = [provided, inferred].filter(Boolean) as string[]

      const isAllowed = candidates.some((m) => isAllowedFileType(m, config.allowedMimeTypes))
      ;(req as any).fileCategory = category

      if (!isAllowed) {
        cb(new Error(`File type ${provided || 'unknown'} not allowed`))
        return
      }

      cb(null, true)
    },
  })
}

export function makeFileUploadMiddleware(category: FileCategory, mode: 'single' | 'array', fieldName: string): RequestHandler {
  const multerInstance = createMulter(category)
  const config = fileTypeConfigs[category]

  if (mode === 'single') {
    const handler = multerInstance.single(fieldName)
    return (req: Request, res: Response, next: NextFunction) => {
      handler(req, res, (err: any) => {
        if (!err) {
          next()
          return
        }

        // Multer errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          next(new AppError('File too large', 400))
          return
        }
        next(new AppError(err.message || 'Upload failed', 400))
      })
    }
  }

  const handler = multerInstance.array(fieldName, config.maxCount)
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: any) => {
      if (!err) {
        next()
        return
      }

      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('File too large', 400))
        return
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        next(new AppError('Too many files', 400))
        return
      }
      next(new AppError(err.message || 'Upload failed', 400))
    })
  }
}

