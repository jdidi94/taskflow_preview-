import fs from 'node:fs'
import path from 'node:path'
import { Types } from 'mongoose'

import { env } from '../config/env.js'
import { File } from '../models/File.js'
import type { FileCategory } from '../models/File.js'

export type FileUploadDocInput = {
  uploadedBy: string
  category: FileCategory
  multerFiles: Express.Multer.File[]
  // Values for linking (optional)
  taskId?: string
  commentId?: string
}

function toUrlFromFilePath(filePath: string): string {
  const rel = path.relative(path.join(process.cwd(), 'uploads'), filePath)
  return `${env.BASE_URL}/uploads/${rel.split(path.sep).join('/')}`
}

export const fileService = {
  async createFilesFromUploads({ uploadedBy, category, multerFiles }: { uploadedBy: string; category: FileCategory; multerFiles: Express.Multer.File[] }) {
    const created = []
    for (const multerFile of multerFiles) {
      const url = toUrlFromFilePath(multerFile.path)
      const doc = await (File as any).createFromUpload(multerFile, uploadedBy, category, url)
      created.push(doc)
    }
    return created
  },

  async listUserFiles(userId: string, { page, limit, category }: { page: number; limit: number; category?: FileCategory }) {
    const query: Record<string, unknown> = { uploadedBy: new Types.ObjectId(userId), isActive: true }
    if (category) query.category = category

    const files = (await File.find(query).sort({ createdAt: -1 }).limit(limit).skip((page - 1) * limit).populate('uploadedBy', 'email name')) as any
    const total = await File.countDocuments(query)

    return {
      files,
      pagination: {
        page,
        limit,
        total,
        totalItems: total,
        currentPage: page,
        pages: Math.ceil(total / limit),
      },
    }
  },

  async getFileById(fileId: string) {
    const file = await File.findOne({ _id: fileId, isActive: true }).populate('uploadedBy', 'email name')
    return file
  },

  async markDownloaded(file: any) {
    if (!file) return
    await (file as any).incrementDownloadCount()
  },

  async deleteFileById(fileId: string, userId: string) {
    const file = await File.findOne({ _id: fileId, isActive: true })
    if (!file) return null
    if (String(file.uploadedBy) !== userId) return undefined

    await (file as any).deleteFromStorage()
    return file
  },

  async assertPhysicalFileExists(filePath: string) {
    await fs.promises.access(filePath)
  },
}

