import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export interface IColumnTaskRef {
  task: Types.ObjectId
  position: number
  addedAt: Date
}

export interface IColumn extends Document {
  name: string
  board: Types.ObjectId
  position: number
  taskIds: IColumnTaskRef[]
  limit: number | null
  isActive: boolean
}

const columnTaskRefSchema = new Schema<IColumnTaskRef>(
  {
    task: { type: Schema.Types.ObjectId, ref: 'Task', required: true },
    position: { type: Number, required: true, min: 0 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const columnSchema = new Schema<IColumn>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    position: { type: Number, required: true, min: 0 },
    taskIds: { type: [columnTaskRefSchema], default: [] },
    limit: { type: Number, default: null, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Column: Model<IColumn> =
  mongoose.models.Column ?? mongoose.model<IColumn>('Column', columnSchema)
