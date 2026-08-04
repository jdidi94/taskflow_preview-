import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type QuotaType = 'api_requests' | 'file_uploads' | 'ai_jobs' | 'storage' | 'users' | 'spaces'
export type QuotaPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface IQuotaUsageHistoryEntry {
  timestamp: Date
  amount: number
  description?: string | null
  metadata: Record<string, unknown>
}

export interface IQuotaOverride {
  reason?: string | null
  overriddenBy?: Types.ObjectId | null
  overriddenAt?: Date | null
  expiresAt?: Date | null
}

export interface IQuotaAlerts {
  warningThreshold: number
  criticalThreshold: number
  warningSent: boolean
  criticalSent: boolean
}

export interface IQuota extends Document {
  userId: Types.ObjectId
  workspaceId: Types.ObjectId | null
  type: QuotaType
  period: QuotaPeriod
  currentUsage: number
  limit: number
  periodStart: Date
  periodEnd: Date
  usageHistory: IQuotaUsageHistoryEntry[]
  isActive: boolean
  isOverridden: boolean
  override: IQuotaOverride
  alerts: IQuotaAlerts
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const usageHistorySchema = new Schema<IQuotaUsageHistoryEntry>(
  {
    timestamp: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    description: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
)

const quotaSchema = new Schema<IQuota>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', default: null },
    type: {
      type: String,
      enum: ['api_requests', 'file_uploads', 'ai_jobs', 'storage', 'users', 'spaces'],
      required: true,
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly', 'yearly'],
      required: true,
    },
    currentUsage: { type: Number, default: 0, min: 0 },
    limit: { type: Number, required: true, min: 0 },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    usageHistory: { type: [usageHistorySchema], default: [] },
    isActive: { type: Boolean, default: true },
    isOverridden: { type: Boolean, default: false },
    override: {
      reason: { type: String, default: null },
      overriddenBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
      overriddenAt: { type: Date, default: null },
      expiresAt: { type: Date, default: null },
    },
    alerts: {
      warningThreshold: { type: Number, default: 0.8 },
      criticalThreshold: { type: Number, default: 0.95 },
      warningSent: { type: Boolean, default: false },
      criticalSent: { type: Boolean, default: false },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

quotaSchema.index({ userId: 1, type: 1, period: 1 })
quotaSchema.index({ workspaceId: 1, type: 1, period: 1 })
quotaSchema.index({ periodStart: 1, periodEnd: 1 })
quotaSchema.index({ isActive: 1 })

quotaSchema.pre('save', function validatePeriod() {
  if (this.periodStart >= this.periodEnd) {
    throw new Error('Period start must be before period end')
  }
  if (this.currentUsage < 0) this.currentUsage = 0
})

export const Quota: Model<IQuota> =
  mongoose.models.Quota ?? mongoose.model<IQuota>('Quota', quotaSchema)
