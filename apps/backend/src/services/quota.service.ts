import { Types } from 'mongoose'

import { Quota, type QuotaPeriod, type QuotaType } from '../models/Quota.js'
import type { SubscriptionPlan } from '../models/User.js'
import { AppError } from '../utils/AppError.js'

type PlanLimits = Record<QuotaType, number>

const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    api_requests: 1000,
    file_uploads: 20,
    ai_jobs: 10,
    storage: 500,
    users: 3,
    spaces: 2,
  },
  basic: {
    api_requests: 10000,
    file_uploads: 100,
    ai_jobs: 50,
    storage: 2048,
    users: 10,
    spaces: 5,
  },
  premium: {
    api_requests: 50000,
    file_uploads: 500,
    ai_jobs: 250,
    storage: 10240,
    users: 50,
    spaces: 25,
  },
  enterprise: {
    api_requests: 250000,
    file_uploads: 5000,
    ai_jobs: 2000,
    storage: 102400,
    users: 500,
    spaces: 200,
  },
}

function monthPeriod() {
  const periodStart = new Date()
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)
  return { periodStart, periodEnd }
}

function sanitizeQuota(doc: any) {
  const usagePercentage = doc.limit > 0 ? (doc.currentUsage / doc.limit) * 100 : 0
  return {
    _id: doc._id,
    userId: doc.userId,
    workspaceId: doc.workspaceId ?? null,
    type: doc.type,
    period: doc.period,
    currentUsage: doc.currentUsage,
    limit: doc.limit,
    periodStart: doc.periodStart,
    periodEnd: doc.periodEnd,
    usageHistory: doc.usageHistory ?? [],
    isActive: doc.isActive,
    isOverridden: doc.isOverridden,
    override: doc.override ?? {},
    alerts: doc.alerts ?? {},
    metadata: doc.metadata ?? {},
    usagePercentage: Math.round(usagePercentage * 100) / 100,
    remaining: Math.max(0, doc.limit - doc.currentUsage),
    isExceeded: doc.currentUsage >= doc.limit,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function getQuotaOr404(id: string) {
  const doc = await Quota.findById(id)
  if (!doc) throw new AppError('Quota not found', 404)
  return doc
}

export const quotaService = {
  sanitizeQuota,
  planLimits(plan: SubscriptionPlan) {
    return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  },

  async seedDefaultsForUser(userId: string, plan: SubscriptionPlan = 'free') {
    const limits = this.planLimits(plan)
    const { periodStart, periodEnd } = monthPeriod()
    const types = Object.keys(limits) as QuotaType[]

    for (const type of types) {
      const existing = await Quota.findOne({
        userId,
        type,
        period: 'monthly',
        isActive: true,
        workspaceId: null,
      })

      if (existing) {
        existing.limit = limits[type]
        existing.periodStart = periodStart
        existing.periodEnd = periodEnd
        existing.metadata = { ...(existing.metadata ?? {}), plan }
        await existing.save()
        continue
      }

      await Quota.create({
        userId,
        workspaceId: null,
        type,
        period: 'monthly',
        limit: limits[type],
        periodStart,
        periodEnd,
        currentUsage: 0,
        metadata: { plan },
      })
    }
  },

  async list(filters: {
    userId?: string
    workspaceId?: string
    type?: QuotaType
    status?: 'active' | 'inactive' | 'exceeded'
  }) {
    const query: Record<string, unknown> = {}
    if (filters.userId) query.userId = filters.userId
    if (filters.workspaceId) query.workspaceId = filters.workspaceId
    if (filters.type) query.type = filters.type
    if (filters.status === 'active') query.isActive = true
    if (filters.status === 'inactive') query.isActive = false

    let docs = await Quota.find(query).sort({ createdAt: -1 })
    if (filters.status === 'exceeded') {
      docs = docs.filter((doc) => doc.currentUsage >= doc.limit)
    }
    return docs.map(sanitizeQuota)
  },

  async getById(id: string) {
    return sanitizeQuota(await getQuotaOr404(id))
  },

  async create(input: {
    userId: string
    workspaceId?: string | null
    type: QuotaType
    period: QuotaPeriod
    limit: number
    periodStart?: string
    periodEnd?: string
    metadata?: Record<string, unknown>
  }) {
    const { periodStart, periodEnd } = monthPeriod()
    const doc = await Quota.create({
      userId: input.userId,
      workspaceId: input.workspaceId ?? null,
      type: input.type,
      period: input.period,
      limit: input.limit,
      periodStart: input.periodStart ? new Date(input.periodStart) : periodStart,
      periodEnd: input.periodEnd ? new Date(input.periodEnd) : periodEnd,
      metadata: input.metadata ?? {},
    })
    return sanitizeQuota(doc)
  },

  async update(
    id: string,
    input: {
      limit?: number
      isActive?: boolean
      alerts?: Partial<{ warningThreshold: number; criticalThreshold: number }>
      metadata?: Record<string, unknown>
    },
  ) {
    const doc = await getQuotaOr404(id)
    if (input.limit !== undefined) doc.limit = input.limit
    if (input.isActive !== undefined) doc.isActive = input.isActive
    if (input.alerts) {
      doc.alerts = {
        ...doc.alerts,
        ...input.alerts,
      }
    }
    if (input.metadata) {
      doc.metadata = { ...(doc.metadata ?? {}), ...input.metadata }
    }
    await doc.save()
    return sanitizeQuota(doc)
  },

  async setOverride(id: string, adminId: string, reason: string, expiresAt?: string | null) {
    const doc = await getQuotaOr404(id)
    doc.isOverridden = true
    doc.override = {
      reason,
      overriddenBy: new Types.ObjectId(adminId),
      overriddenAt: new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    }
    await doc.save()
    return sanitizeQuota(doc)
  },

  async clearOverride(id: string) {
    const doc = await getQuotaOr404(id)
    doc.isOverridden = false
    doc.override = {
      reason: null,
      overriddenBy: null,
      overriddenAt: null,
      expiresAt: null,
    }
    await doc.save()
    return sanitizeQuota(doc)
  },

  async reset(id: string) {
    const doc = await getQuotaOr404(id)
    doc.currentUsage = 0
    doc.usageHistory = []
    doc.alerts.warningSent = false
    doc.alerts.criticalSent = false
    await doc.save()
    return sanitizeQuota(doc)
  },

  async remove(id: string) {
    const doc = await getQuotaOr404(id)
    await doc.deleteOne()
  },

  async stats(userId?: string, workspaceId?: string) {
    const match: Record<string, unknown> = {}
    if (userId) match.userId = new Types.ObjectId(userId)
    if (workspaceId) match.workspaceId = new Types.ObjectId(workspaceId)

    const rows = await Quota.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          totalQuotas: { $sum: 1 },
          totalUsage: { $sum: '$currentUsage' },
          totalLimit: { $sum: '$limit' },
          exceededQuotas: {
            $sum: { $cond: [{ $gte: ['$currentUsage', '$limit'] }, 1, 0] },
          },
        },
      },
    ])

    return rows.reduce(
      (acc, row) => {
        acc[row._id] = {
          totalQuotas: row.totalQuotas,
          totalUsage: row.totalUsage,
          totalLimit: row.totalLimit,
          exceededQuotas: row.exceededQuotas,
          usagePercentage: row.totalLimit > 0 ? (row.totalUsage / row.totalLimit) * 100 : 0,
        }
        return acc
      },
      {} as Record<string, unknown>,
    )
  },
}
