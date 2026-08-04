import mongoose, { type Document, type Model, Schema, Types } from 'mongoose'

export type IntegrationCategory =
  | 'communication'
  | 'storage'
  | 'analytics'
  | 'development'
  | 'marketing'

export type IntegrationType = 'generic' | 'ai_token'
export type IntegrationStatus = 'active' | 'inactive' | 'error' | 'pending'
export type IntegrationSyncStatus = 'success' | 'warning' | 'error'
export type AiProvider = 'google' | 'openai' | 'anthropic' | 'azure'

export interface IIntegration extends Document {
  integrationType: IntegrationType
  name: string
  description: string
  category: IntegrationCategory
  status: IntegrationStatus
  provider?: AiProvider | null
  apiKey?: string | null
  config: Record<string, unknown>
  lastSync: Date | null
  syncStatus: IntegrationSyncStatus
  isEnabled: boolean
  isArchived: boolean
  isValid: boolean
  validationError: string | null
  lastValidatedAt: Date | null
  lastUsedAt: Date | null
  usageCount: number
  errorMessage: string | null
  syncInterval: number
  lastError: Date | null
  retryCount: number
  maxRetries: number
  webhookUrl: string | null
  webhookSecret?: string | null
  notes: string | null
  createdBy?: Types.ObjectId | null
  updatedBy?: Types.ObjectId | null
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

const integrationSchema = new Schema<IIntegration>(
  {
    integrationType: {
      type: String,
      enum: ['generic', 'ai_token'],
      default: 'generic',
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['communication', 'storage', 'analytics', 'development', 'marketing'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'error', 'pending'],
      default: 'pending',
    },
    provider: {
      type: String,
      enum: ['google', 'openai', 'anthropic', 'azure'],
      default: null,
    },
    apiKey: { type: String, default: null, select: false },
    config: { type: Schema.Types.Mixed, default: {} },
    lastSync: { type: Date, default: null },
    syncStatus: {
      type: String,
      enum: ['success', 'warning', 'error'],
      default: 'error',
    },
    isEnabled: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    isValid: { type: Boolean, default: true },
    validationError: { type: String, default: null },
    lastValidatedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    usageCount: { type: Number, default: 0 },
    errorMessage: { type: String, default: null },
    syncInterval: { type: Number, default: 60 },
    lastError: { type: Date, default: null },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    webhookUrl: { type: String, default: null },
    webhookSecret: { type: String, default: null, select: false },
    notes: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

integrationSchema.index({ category: 1, status: 1 })
integrationSchema.index({ integrationType: 1, provider: 1, isArchived: 1 })
integrationSchema.index({ isEnabled: 1 })
integrationSchema.index({ lastSync: 1 })

export const Integration: Model<IIntegration> =
  mongoose.models.Integration ?? mongoose.model<IIntegration>('Integration', integrationSchema)

