import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export interface IBoardMember {
  user: Types.ObjectId
  permissions: Array<'view' | 'edit' | 'delete' | 'manage_columns' | 'manage_members'>
  addedAt: Date
}

export interface IBoard extends Document {
  name: string
  description?: string
  type: 'kanban' | 'list' | 'calendar' | 'timeline'
  visibility: 'private' | 'workspace' | 'public'
  space: Types.ObjectId
  owner?: Types.ObjectId
  members: IBoardMember[]
  archived: boolean
  archivedAt: Date | null
  isActive: boolean
}

const boardMemberSchema = new Schema<IBoardMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    permissions: {
      type: [String],
      enum: ['view', 'edit', 'delete', 'manage_columns', 'manage_members'],
      default: ['view', 'edit'],
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const boardSchema = new Schema<IBoard>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 500 },
    type: {
      type: String,
      enum: ['kanban', 'list', 'calendar', 'timeline'],
      default: 'kanban',
    },
    visibility: {
      type: String,
      enum: ['private', 'workspace', 'public'],
      default: 'private',
    },
    space: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    members: { type: [boardMemberSchema], default: [] },
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Board: Model<IBoard> =
  mongoose.models.Board ?? mongoose.model<IBoard>('Board', boardSchema)
