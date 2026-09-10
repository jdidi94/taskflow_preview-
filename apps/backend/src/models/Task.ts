import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'archived'

export interface ITaskComment {
  _id?: Types.ObjectId
  author: Types.ObjectId
  body: string
  attachments: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

export interface IChecklistItem {
  _id?: Types.ObjectId
  text: string
  done: boolean
}

export interface ITaskDependency {
  task: Types.ObjectId
  type: 'blocks' | 'blocked_by' | 'related'
}

export interface ITask extends Document {
  title: string
  description?: string
  board: Types.ObjectId
  space: Types.ObjectId
  column: Types.ObjectId
  priority: TaskPriority
  status: TaskStatus
  color: string
  assignees: Types.ObjectId[]
  reporter: Types.ObjectId
  watchers: Types.ObjectId[]
  tags: string[]
  dueDate: Date | null
  position: number
  archived: boolean
  attachments: Types.ObjectId[]
  comments: ITaskComment[]
  checklist: IChecklistItem[]
  dependencies: ITaskDependency[]
}

const taskCommentSchema = new Schema<ITaskComment>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
  },
  { timestamps: true },
)

const checklistItemSchema = new Schema<IChecklistItem>(
  {
    text: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: true },
)

const taskDependencySchema = new Schema<ITaskDependency>(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    type: { type: String, enum: ['blocks', 'blocked_by', 'related'], default: 'related' },
  },
  { _id: true },
)

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 2000 },
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    space: { type: Schema.Types.ObjectId, ref: 'Space', required: true },
    column: { type: Schema.Types.ObjectId, ref: 'Column', required: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'done', 'archived'],
      default: 'todo',
    },
    color: { type: String, default: '#6B7280' },
    assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    watchers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    tags: [{ type: String, trim: true, maxlength: 50 }],
    dueDate: { type: Date, default: null },
    position: { type: Number, default: 0, min: 0 },
    archived: { type: Boolean, default: false },
    attachments: [{ type: Schema.Types.ObjectId, ref: 'File' }],
    comments: { type: [taskCommentSchema], default: [] },
    checklist: { type: [checklistItemSchema], default: [] },
    dependencies: { type: [taskDependencySchema], default: [] },
  },
  { timestamps: true },
)

taskSchema.index({ board: 1, column: 1, position: 1 })
taskSchema.index({ board: 1, archived: 1, position: 1 })
taskSchema.index({ assignees: 1, archived: 1, dueDate: 1 })
taskSchema.index({ space: 1, archived: 1 })

export const Task: Model<ITask> =
  mongoose.models.Task ?? mongoose.model<ITask>('Task', taskSchema)
