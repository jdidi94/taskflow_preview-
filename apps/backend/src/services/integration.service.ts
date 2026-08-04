import { Integration, type IIntegration } from '../models/Integration.js'
import { AppError } from '../utils/AppError.js'

function sanitizeIntegration(doc: any) {
  return {
    _id: doc._id,
    name: doc.name,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    config: doc.config ?? {},
    lastSync: doc.lastSync ?? null,
    syncStatus: doc.syncStatus,
    isEnabled: doc.isEnabled,
    errorMessage: doc.errorMessage ?? null,
    syncInterval: doc.syncInterval,
    lastError: doc.lastError ?? null,
    retryCount: doc.retryCount,
    maxRetries: doc.maxRetries,
    webhookUrl: doc.webhookUrl ?? null,
    metadata: doc.metadata ?? {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function getIntegrationOr404(id: string, includeSecrets = false) {
  const query = Integration.findById(id)
  if (includeSecrets) query.select('+apiKey +webhookSecret')
  const doc = await query
  if (!doc) throw new AppError('Integration not found', 404)
  return doc
}

export const integrationService = {
  sanitizeIntegration,

  async list(filters: { category?: string; status?: string; search?: string }) {
    const query: Record<string, unknown> = {}
    if (filters.category) query.category = filters.category
    if (filters.status) query.status = filters.status
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ]
    }
    const items = await Integration.find(query).sort({ createdAt: -1 })
    return items.map(sanitizeIntegration)
  },

  async stats() {
    const docs = await Integration.find().lean()
    const total = docs.length
    const byStatus: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    for (const doc of docs) {
      byStatus[doc.status] = (byStatus[doc.status] ?? 0) + 1
      byCategory[doc.category] = (byCategory[doc.category] ?? 0) + 1
    }
    return { total, byStatus, byCategory }
  },

  async getById(id: string) {
    const doc = await getIntegrationOr404(id)
    return sanitizeIntegration(doc)
  },

  async create(input: Partial<IIntegration>) {
    const doc = await Integration.create({
      ...input,
      status: input.status ?? 'pending',
      syncStatus: input.syncStatus ?? 'error',
      config: input.config ?? {},
      metadata: input.metadata ?? {},
      isEnabled: input.isEnabled ?? false,
      syncInterval: input.syncInterval ?? 60,
      errorMessage: input.errorMessage ?? null,
      lastSync: input.lastSync ?? null,
      lastError: input.lastError ?? null,
      retryCount: input.retryCount ?? 0,
      maxRetries: input.maxRetries ?? 3,
      webhookUrl: input.webhookUrl ?? null,
      webhookSecret: input.webhookSecret ?? null,
      apiKey: input.apiKey ?? null,
    })
    return sanitizeIntegration(doc)
  },

  async update(id: string, input: Partial<IIntegration>) {
    const updateData = {
      ...input,
      ...(input.lastSync !== undefined ? { lastSync: input.lastSync } : {}),
    }
    const doc = await Integration.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
    if (!doc) throw new AppError('Integration not found', 404)
    return sanitizeIntegration(doc)
  },

  async remove(id: string) {
    const doc = await getIntegrationOr404(id)
    await doc.deleteOne()
  },

  async toggle(id: string) {
    const doc = await getIntegrationOr404(id)
    doc.isEnabled = !doc.isEnabled
    doc.status = doc.isEnabled ? 'active' : 'inactive'
    if (!doc.isEnabled) doc.errorMessage = null
    await doc.save()
    return sanitizeIntegration(doc)
  },

  async test(id: string) {
    const doc = await getIntegrationOr404(id, true)
    const success = doc.isEnabled && Boolean(doc.apiKey || doc.webhookUrl)
    doc.status = success ? 'active' : 'error'
    doc.syncStatus = success ? 'success' : 'error'
    doc.errorMessage = success ? null : 'Missing credentials or integration disabled'
    doc.lastError = success ? null : new Date()
    await doc.save()
    return {
      success,
      message: success ? 'Connection successful' : 'Connection failed',
      integration: sanitizeIntegration(doc),
    }
  },

  async sync(id: string) {
    const doc = await getIntegrationOr404(id, true)
    if (!doc.isEnabled) throw new AppError('Integration must be enabled before syncing', 400)
    if (!doc.apiKey) throw new AppError('Integration requires an apiKey to sync', 400)

    doc.lastSync = new Date()
    doc.syncStatus = 'success'
    doc.status = 'active'
    doc.errorMessage = null
    doc.retryCount = 0
    await doc.save()

    return sanitizeIntegration(doc)
  },

  async health(id: string) {
    const result = await this.test(id)
    return {
      healthy: result.success,
      checkedAt: new Date(),
      integration: result.integration,
      message: result.message,
    }
  },
}

