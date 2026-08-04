import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export interface ISpaceMember {
  user: Types.ObjectId
  role: 'viewer' | 'member' | 'admin'
  joinedAt: Date
}

export interface ISpace extends Document {
  name: string
  description?: string
  workspace: Types.ObjectId
  members: ISpaceMember[]
  boards: Types.ObjectId[]
  isActive: boolean
  archived: boolean
  archivedAt: Date | null
}

const spaceMemberSchema = new Schema<ISpaceMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['viewer', 'member', 'admin'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const spaceSchema = new Schema<ISpace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000 },
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    members: { type: [spaceMemberSchema], default: [] },
    boards: [{ type: Schema.Types.ObjectId, ref: 'Board' }],
    isActive: { type: Boolean, default: true },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

export const Space: Model<ISpace> =
  mongoose.models.Space ?? mongoose.model<ISpace>('Space', spaceSchema)
