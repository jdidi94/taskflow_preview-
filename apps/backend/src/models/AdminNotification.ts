import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type AdminNotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface IAdminNotification extends Document {
  recipient: Types.ObjectId
  title: string
  message: string
  type: string
  priority: AdminNotificationPriority
  isRead: boolean
  readAt: Date | null
  href?: string | null
  auditLogId?: Types.ObjectId | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const adminNotificationSchema = new Schema<IAdminNotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, required: true, trim: true, index: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    href: { type: String, default: null },
    auditLogId: { type: Schema.Types.ObjectId, ref: 'AdminAuditLog', default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

adminNotificationSchema.index({ recipient: 1, createdAt: -1 })
adminNotificationSchema.index({ recipient: 1, isRead: 1 })

export const AdminNotification: Model<IAdminNotification> =
  mongoose.models.AdminNotification ??
  mongoose.model<IAdminNotification>('AdminNotification', adminNotificationSchema)
