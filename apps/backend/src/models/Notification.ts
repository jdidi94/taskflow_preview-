import mongoose, { type Document, Schema, Types } from 'mongoose'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'
export type NotificationReadStatus = 'unread' | 'read' | 'archived'

export type NotificationEntityType =
  | 'task'
  | 'board'
  | 'space'
  | 'comment'
  | 'user'
  | 'workspace'
  | 'template'

export interface INotificationEntity {
  entityType: NotificationEntityType
  entityId: Types.ObjectId
}

export interface INotification extends Document {
  recipient: Types.ObjectId
  sender?: Types.ObjectId | null
  type: string
  title: string
  message: string
  relatedEntity?: INotificationEntity | null
  priority: NotificationPriority

  isRead: boolean
  readAt: Date | null

  isArchived: boolean
  archivedAt: Date | null

  // Payload for integration-specific consumers
  metadata: Record<string, unknown>
  tags: string[]
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    type: { type: String, required: true },

    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 500 },

    relatedEntity: {
      type: {
        entityType: {
          type: String,
          enum: ['task', 'board', 'space', 'comment', 'user', 'workspace', 'template'],
          required: true,
        },
        entityId: { type: Schema.Types.ObjectId, required: true },
      },
      required: false,
      default: null,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      required: true,
    },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },

    metadata: { type: Map, of: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
)

notificationSchema.methods.markAsRead = async function markAsRead() {
  this.isRead = true
  this.readAt = new Date()
  return this.save()
}

export const Notification =
  mongoose.models.Notification ?? mongoose.model<INotification>('Notification', notificationSchema)

