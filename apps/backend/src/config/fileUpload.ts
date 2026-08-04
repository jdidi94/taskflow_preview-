import path from 'node:path'

import type { FileCategory } from '../models/File.js'

export const UPLOAD_ROOT = path.join(process.cwd(), 'uploads')

export const fileTypeConfigs: Record<
  FileCategory,
  {
    folder: string
    allowedMimeTypes: string[]
    maxFileSize: number
    maxCount: number
  }
> = {
  avatar: {
    folder: 'avatars',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 5 * 1024 * 1024,
    maxCount: 1,
  },
  task_attachment: {
    folder: 'tasks',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ],
    maxFileSize: 10 * 1024 * 1024,
    maxCount: 10,
  },
  comment_attachment: {
    folder: 'comments',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ],
    maxFileSize: 5 * 1024 * 1024,
    maxCount: 5,
  },
  logo: {
    folder: 'logos',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    maxFileSize: 1 * 1024 * 1024,
    maxCount: 1,
  },
  board_background: {
    folder: 'boards',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxFileSize: 3 * 1024 * 1024,
    maxCount: 1,
  },
  general: {
    folder: 'general',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ],
    maxFileSize: 10 * 1024 * 1024,
    maxCount: 5,
  },
}

