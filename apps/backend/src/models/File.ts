import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import mongoose, { type Document, Schema, Types } from 'mongoose'

export type FileCategory =
  | 'avatar'
  | 'task_attachment'
  | 'comment_attachment'
  | 'logo'
  | 'board_background'
  | 'general'

export type FileSource = 'local' | 'google_drive' | 'url'

export interface IFileProviderMeta {
  thumbnailLink?: string | null
  iconLink?: string | null
  modifiedTime?: string | null
  [key: string]: unknown
}

export interface IFile extends Document {
  filename: string
  originalName: string
  mimeType: string
  size: number
  path: string
  url: string
  extension: string
  checksum: string
  encoding: string
  fieldname: string

  category: FileCategory
  uploadedBy: Types.ObjectId

  source: FileSource
  externalId?: string | null
  externalUrl?: string | null
  providerMeta?: IFileProviderMeta | null

  workspace?: Types.ObjectId | null
  space?: Types.ObjectId | null

  isActive: boolean
  downloadCount: number
  lastAccessedAt?: Date | null

  tags: string[]
}

type UploadedFileLike = {
  filename: string
  originalname: string
  mimetype: string
  size: number
  path: string
  encoding?: string
  fieldname?: string
}

const fileSchema = new Schema<IFile>(
  {
    filename: { type: String, required: true, unique: true },
    originalName: { type: String, required: true, maxlength: 255 },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    path: { type: String, required: true },
    url: { type: String, required: true },
    extension: { type: String, required: true },
    checksum: { type: String, required: true },
    encoding: { type: String, default: '7bit' },
    fieldname: { type: String, default: 'file' },

    category: {
      type: String,
      enum: ['avatar', 'task_attachment', 'comment_attachment', 'logo', 'board_background', 'general'],
      required: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    source: {
      type: String,
      enum: ['local', 'google_drive', 'url'],
      default: 'local',
    },
    externalId: { type: String, default: null, index: true },
    externalUrl: { type: String, default: null },
    providerMeta: { type: Schema.Types.Mixed, default: null },

    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    space: { type: Schema.Types.ObjectId, ref: 'Space', default: null },

    isActive: { type: Boolean, default: true },
    downloadCount: { type: Number, default: 0 },
    lastAccessedAt: { type: Date, default: null },

    tags: { type: [String], default: [] },
  },
  { timestamps: true },
)

fileSchema.methods.incrementDownloadCount = async function incrementDownloadCount() {
  this.downloadCount += 1
  this.lastAccessedAt = new Date()
  await this.save()
}

fileSchema.methods.deleteFromStorage = async function deleteFromStorage() {
  if (this.source === 'local' && this.path && this.path !== 'external') {
    try {
      await fs.unlink(this.path)
    } catch {
      // ignore missing physical file
    }
  }

  this.isActive = false
  await this.save()
  return true
}

fileSchema.statics.createFromUpload = async function createFromUpload(
  multerFile: UploadedFileLike,
  uploadedBy: string | Types.ObjectId,
  category: FileCategory,
  url: string,
) {
  const extension = path.extname(multerFile.originalname).replace('.', '')
  const buffer = await fs.readFile(multerFile.path)
  const checksum = crypto.createHash('md5').update(buffer).digest('hex')

  return this.create({
    filename: multerFile.filename,
    originalName: multerFile.originalname,
    mimeType: multerFile.mimetype,
    size: multerFile.size,
    path: multerFile.path,
    url,
    extension: extension || 'bin',
    checksum,
    encoding: multerFile.encoding ?? '7bit',
    fieldname: multerFile.fieldname ?? 'file',
    category,
    uploadedBy,
    source: 'local',
    isActive: true,
    downloadCount: 0,
    lastAccessedAt: null,
  })
}

export const File = mongoose.models.File ?? mongoose.model<IFile>('File', fileSchema)
