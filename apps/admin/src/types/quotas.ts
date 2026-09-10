export type QuotaType = 'api_requests' | 'file_uploads' | 'ai_jobs' | 'storage' | 'users' | 'spaces'
export type QuotaPeriod = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly'

export type Quota = {
  _id?: string
  id?: string
  userId: string
  workspaceId?: string | null
  type: QuotaType | string
  period: QuotaPeriod | string
  currentUsage: number
  limit: number
  periodStart?: string
  periodEnd?: string
  isActive: boolean
  isOverridden?: boolean
  override?: {
    reason?: string | null
    expiresAt?: string | null
  }
  createdAt?: string
  updatedAt?: string
}

export type CreateQuotaInput = {
  userId: string
  workspaceId?: string | null
  type: QuotaType
  period: QuotaPeriod
  limit: number
}

export type UpdateQuotaInput = {
  limit?: number
  isActive?: boolean
}

export type QuotaStat = {
  totalQuotas: number
  totalUsage: number
  totalLimit: number
  exceededQuotas: number
  usagePercentage: number
}

export type QuotaStatsMap = Record<string, QuotaStat>
