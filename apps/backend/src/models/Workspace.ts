import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export interface IWorkspaceMember {
  user: Types.ObjectId
  role: 'member' | 'admin'
  joinedAt: Date
}

export interface IWorkspace extends Document {
  name: string
  description?: string
  avatar: string | null
  owner: Types.ObjectId
  members: IWorkspaceMember[]
  spaces: Types.ObjectId[]
  isActive: boolean
  archived: boolean
  archivedAt: Date | null
  githubOrg: {
    id: number | null
    login: string | null
    name: string | null
    url: string | null
    avatar: string | null
    description: string | null
    linkedAt: Date | null
  } | null
  rules: {
    content: string
    updatedAt: Date | null
    updatedBy: Types.ObjectId | null
  }
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'admin'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    avatar: { type: String, default: null },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [workspaceMemberSchema], default: [] },
    spaces: [{ type: Schema.Types.ObjectId, ref: 'Space' }],
    isActive: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    githubOrg: {
      type: {
        id: { type: Number, default: null },
        login: { type: String, default: null },
        name: { type: String, default: null },
        url: { type: String, default: null },
        avatar: { type: String, default: null },
        description: { type: String, default: null },
        linkedAt: { type: Date, default: null },
      },
      default: null,
    },
    rules: {
      content: { type: String, default: '', maxlength: 20000 },
      updatedAt: { type: Date, default: null },
      updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
  },
  { timestamps: true },
)

export const Workspace: Model<IWorkspace> =
  mongoose.models.Workspace ?? mongoose.model<IWorkspace>('Workspace', workspaceSchema)
