import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { Types } from 'mongoose'

import { env } from '../config/env.js'
import { File } from '../models/File.js'
import type { FileCategory, FileSource, IFileProviderMeta } from '../models/File.js'

export type FileUploadDocInput = {
  uploadedBy: string
  category: FileCategory
  multerFiles: Express.Multer.File[]
  taskId?: string
  commentId?: string
}

export type ExternalFileInput = {
  uploadedBy: string
  category: FileCategory
  source: Exclude<FileSource, 'local'>
  originalName: string
  mimeType: string
  size?: number
  externalId?: string | null
  externalUrl: string
  providerMeta?: IFileProviderMeta | null
}

function toUrlFromFilePath(filePath: string): string {
  const rel = path.relative(path.join(process.cwd(), 'uploads'), filePath)
  return `${env.BASE_URL}/uploads/${rel.split(path.sep).join('/')}`
}

function extensionFromName(name: string) {
  const ext = path.extname(name).replace('.', '')
  return ext || 'bin'
}

export const fileService = {
  async createFilesFromUploads({
    uploadedBy,
    category,
    multerFiles,
  }: {
    uploadedBy: string
    category: FileCategory
    multerFiles: Express.Multer.File[]
  }) {
    const created = []
    for (const multerFile of multerFiles) {
      const url = toUrlFromFilePath(multerFile.path)
      const doc = await (File as any).createFromUpload(multerFile, uploadedBy, category, url)
      created.push(doc)
    }
    return created
  },

  async createExternalFile(input: ExternalFileInput) {
    const externalId = input.externalId?.trim() || null
    const filenameSeed = externalId || crypto.randomBytes(8).toString('hex')
    const filename = `${input.source}_${filenameSeed}_${Date.now()}`
    const checksum = crypto
      .createHash('sha256')
      .update(`${input.source}:${externalId ?? input.externalUrl}`)
      .digest('hex')

    return File.create({
      filename,
      originalName: input.originalName.slice(0, 255),
      mimeType: input.mimeType || 'application/octet-stream',
      size: Math.max(0, input.size ?? 0),
      path: 'external',
      url: input.externalUrl,
      extension: extensionFromName(input.originalName),
      checksum,
      encoding: '7bit',
      fieldname: 'external',
      category: input.category,
      uploadedBy: input.uploadedBy,
      source: input.source,
      externalId,
      externalUrl: input.externalUrl,
      providerMeta: input.providerMeta ?? null,
      isActive: true,
      downloadCount: 0,
      lastAccessedAt: null,
      tags: [],
    })
  },

  async listUserFiles(
    userId: string,
    { page, limit, category }: { page: number; limit: number; category?: FileCategory },
  ) {
    const query: Record<string, unknown> = {
      uploadedBy: new Types.ObjectId(userId),
      isActive: true,
    }
    if (category) query.category = category

    const files = (await File.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('uploadedBy', 'email name')) as any
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
    return File.findOne({ _id: fileId, isActive: true }).populate('uploadedBy', 'email name')
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
