import mongoose, { type Document, Schema, type Types } from 'mongoose'

export type TemplateType = 'task' | 'board' | 'space' | 'workflow' | 'checklist'
export type TemplateStatus = 'draft' | 'active' | 'archived' | 'deprecated'

export type TemplateCategory =
  | 'Marketing'
  | 'Development'
  | 'Design'
  | 'Sales'
  | 'Support'
  | 'Operations'
  | 'HR'
  | 'Finance'
  | 'General'
  | 'Custom'

export type TemplateVersion = { major: number; minor: number; patch: number }

export interface ITemplateAccessControl {
  allowedUsers: Types.ObjectId[]
  allowedWorkspaces: Types.ObjectId[]
  allowedRoles: string[]
}

export interface ITemplatePreview {
  thumbnail?: Types.ObjectId | null
  screenshot?: Types.ObjectId | null
}

export interface ITemplateUsageRating {
  average: number
  count: number
}

export interface ITemplate extends Document {
  name: string
  description?: string
  type: TemplateType
  content: unknown

  createdBy: Types.ObjectId

  isPublic: boolean
  isSystem: boolean

  category: TemplateCategory
  tags: string[]
  status: TemplateStatus

  accessControl: ITemplateAccessControl

  // Engagement
  views: number
  likedBy: Types.ObjectId[]
  viewedBy: Types.ObjectId[]

  // Usage stats (lightweight)
  usage: {
    totalUses: number
    lastUsed: Date | null
    rating: ITemplateUsageRating
  }

  // Versioning
  version: TemplateVersion

  // Optional preview files
  preview?: ITemplatePreview

  metadata: Record<string, unknown>
}

const templateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    type: { type: String, enum: ['task', 'board', 'space', 'workflow', 'checklist'], required: true },

    content: { type: Schema.Types.Mixed, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    isPublic: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },

    category: {
      type: String,
      enum: [
        'Marketing',
        'Development',
        'Design',
        'Sales',
        'Support',
        'Operations',
        'HR',
        'Finance',
        'General',
        'Custom',
      ],
      default: 'General',
    },

    status: { type: String, enum: ['draft', 'active', 'archived', 'deprecated'], default: 'draft' },

    tags: { type: [String], default: [], maxlength: 50 },

    accessControl: {
      allowedUsers: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
      allowedWorkspaces: { type: [Schema.Types.ObjectId], ref: 'Workspace', default: [] },
      allowedRoles: { type: [String], default: [] },
    },

    views: { type: Number, default: 0, min: 0 },
    likedBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    viewedBy: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },

    usage: {
      totalUses: { type: Number, default: 0 },
      lastUsed: { type: Date, default: null },
      rating: {
        average: { type: Number, default: 0, min: 0, max: 5 },
        count: { type: Number, default: 0 },
      },
    },

    version: {
      major: { type: Number, default: 1 },
      minor: { type: Number, default: 0 },
      patch: { type: Number, default: 0 },
    },

    preview: {
      thumbnail: { type: Schema.Types.ObjectId, ref: 'File', default: null },
      screenshot: { type: Schema.Types.ObjectId, ref: 'File', default: null },
    },

    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

templateSchema.statics.findPublic = function (type?: TemplateType, category?: TemplateCategory) {
  const query: Record<string, unknown> = { isPublic: true, status: 'active' }
  if (type) query.type = type
  if (category) query.category = category
  return this.find(query).sort({ 'usage.totalUses': -1 })
}

templateSchema.methods.canViewerAccess = function canViewerAccess(viewer: { id?: Types.ObjectId | null; role?: string; workspaceId?: Types.ObjectId | null } | null) {
  if (this.isSystem) return true
  if (this.isPublic) return true
  const viewerId = viewer?.id ? String(viewer.id) : null
  if (viewerId && String(this.createdBy) === viewerId) return true
  if (!viewerId) return false

  if (
    Array.isArray(this.accessControl?.allowedUsers) &&
    this.accessControl.allowedUsers.some((u: Types.ObjectId) => String(u) === viewerId)
  ) {
    return true
  }

  if (viewer?.role && Array.isArray(this.accessControl?.allowedRoles) && this.accessControl.allowedRoles.includes(viewer.role)) {
    return true
  }

  if (
    viewer?.workspaceId &&
    Array.isArray(this.accessControl?.allowedWorkspaces) &&
    this.accessControl.allowedWorkspaces.some((w: Types.ObjectId) => String(w) === String(viewer.workspaceId))
  ) {
    return true
  }

  return false
}

export const Template = mongoose.models.Template ?? mongoose.model<ITemplate>('Template', templateSchema)

