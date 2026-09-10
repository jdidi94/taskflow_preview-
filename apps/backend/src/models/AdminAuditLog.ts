import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type AdminAuditTargetType = 'user' | 'admin' | 'template' | 'token' | 'quota' | 'system'

export interface IAdminAuditLog extends Document {
  actorId: Types.ObjectId
  actorName: string
  actorEmail?: string | null
  action: string
  targetType: AdminAuditTargetType
  targetId?: string | null
  targetLabel?: string | null
  summary: string
  metadata: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
  createdAt: Date
  updatedAt: Date
}

const adminAuditLogSchema = new Schema<IAdminAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    actorName: { type: String, required: true, trim: true },
    actorEmail: { type: String, default: null, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true, index: true },
    targetType: {
      type: String,
      enum: ['user', 'admin', 'template', 'token', 'quota', 'system'],
      required: true,
      index: true,
    },
    targetId: { type: String, default: null },
    targetLabel: { type: String, default: null, trim: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true },
)

adminAuditLogSchema.index({ createdAt: -1 })
adminAuditLogSchema.index({ actorId: 1, createdAt: -1 })

export const AdminAuditLog: Model<IAdminAuditLog> =
  mongoose.models.AdminAuditLog ?? mongoose.model<IAdminAuditLog>('AdminAuditLog', adminAuditLogSchema)
