import { Types } from 'mongoose'

import { Integration, type AiProvider } from '../models/Integration.js'
import { AppError } from '../utils/AppError.js'

type AiTokenStatus = 'active' | 'inactive' | 'archived' | 'invalid'

type AiTokenListFilters = {
  provider?: AiProvider
  status?: AiTokenStatus
  includeArchived?: boolean
}

type AiTokenCreateInput = {
  provider: AiProvider
  name: string
  description?: string
  token: string
  config?: Record<string, unknown>
  notes?: string
}

type AiTokenUpdateInput = {
  name?: string
  description?: string
  config?: Record<string, unknown>
  notes?: string
}

const AI_TOKEN_INTEGRATION_TYPE = 'ai_token'
const AI_TOKEN_CATEGORY = 'development'

function defaultConfigForProvider(provider: AiProvider) {
  switch (provider) {
    case 'openai':
      return { model: 'gpt-4o-mini', maxTokens: 2000, temperature: 0.3, timeout: 30000 }
    case 'anthropic':
      return { model: 'claude-3-5-sonnet-latest', maxTokens: 2000, temperature: 0.3, timeout: 30000 }
    case 'azure':
      return { model: 'gpt-4o-mini', maxTokens: 2000, temperature: 0.3, timeout: 30000 }
    case 'google':
    default:
      return { model: 'gemini-1.5-flash', maxTokens: 2000, temperature: 0.3, timeout: 30000 }
  }
}

function maskSecret(value?: string | null) {
  if (!value) return ''
  if (value.length <= 12) return `${value.slice(0, 4)}...${value.slice(-2)}`
  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

function computeStatus(doc: any): AiTokenStatus {
  if (doc.isArchived) return 'archived'
  if (!doc.isValid) return 'invalid'
  if (doc.isEnabled) return 'active'
  return 'inactive'
}

function sanitizeAiToken(doc: any) {
  return {
    _id: doc._id,
    provider: doc.provider,
    name: doc.name,
    description: doc.description,
    status: computeStatus(doc),
    maskedToken: maskSecret(doc.apiKey),
    config: doc.config ?? {},
    notes: doc.notes ?? null,
    isActive: Boolean(doc.isEnabled && !doc.isArchived),
    isArchived: Boolean(doc.isArchived),
    isValid: Boolean(doc.isValid),
    validationError: doc.validationError ?? null,
    lastValidatedAt: doc.lastValidatedAt ?? null,
    lastUsedAt: doc.lastUsedAt ?? null,
    usageCount: doc.usageCount ?? 0,
    createdBy: doc.createdBy ?? null,
    updatedBy: doc.updatedBy ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }
}

async function getAiTokenOr404(id: string, includeSecret = false) {
  const query = Integration.findOne({ _id: id, integrationType: AI_TOKEN_INTEGRATION_TYPE })
  if (includeSecret) query.select('+apiKey')
  const doc = await query
  if (!doc) throw new AppError('AI token not found', 404)
  return doc
}

async function deactivateOtherProviderTokens(provider: AiProvider, activeId: string, adminId: string) {
  await Integration.updateMany(
    {
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
      provider,
      _id: { $ne: new Types.ObjectId(activeId) },
      isArchived: false,
    },
    {
      $set: {
        isEnabled: false,
        isArchived: true,
        status: 'inactive',
        updatedBy: new Types.ObjectId(adminId),
      },
    },
  )
}

export const aiTokenService = {
  sanitizeAiToken,

  async list(filters: AiTokenListFilters) {
    const query: Record<string, unknown> = {
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
    }

    if (filters.provider) query.provider = filters.provider
    if (!filters.includeArchived && filters.status !== 'archived') query.isArchived = false

    switch (filters.status) {
      case 'active':
        query.isEnabled = true
        query.isArchived = false
        query.isValid = true
        break
      case 'inactive':
        query.isEnabled = false
        query.isArchived = false
        break
      case 'archived':
        query.isArchived = true
        break
      case 'invalid':
        query.isValid = false
        break
    }

    const docs = await Integration.find(query).select('+apiKey').sort({ createdAt: -1 })
    return docs.map(sanitizeAiToken)
  },

  async getActiveToken(provider: AiProvider) {
    const doc = await Integration.findOne({
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
      provider,
      isEnabled: true,
      isArchived: false,
      isValid: true,
    })
      .select('+apiKey')
      .sort({ updatedAt: -1 })

    if (!doc) throw new AppError(`No active AI token found for provider ${provider}`, 404)
    return sanitizeAiToken(doc)
  },

  async create(input: AiTokenCreateInput, adminId: string) {
    const duplicate = await Integration.findOne({
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
      provider: input.provider,
      apiKey: input.token,
    }).select('+apiKey')

    if (duplicate) throw new AppError('This AI token already exists for the provider', 409)

    const doc = await Integration.create({
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
      category: AI_TOKEN_CATEGORY,
      provider: input.provider,
      name: input.name,
      description: input.description ?? `${input.provider} AI token`,
      apiKey: input.token,
      config: {
        ...defaultConfigForProvider(input.provider),
        ...(input.config ?? {}),
      },
      notes: input.notes ?? null,
      metadata: { source: 'ai_tokens' },
      isEnabled: true,
      isArchived: false,
      isValid: true,
      validationError: null,
      lastValidatedAt: new Date(),
      status: 'active',
      syncStatus: 'success',
      createdBy: new Types.ObjectId(adminId),
      updatedBy: new Types.ObjectId(adminId),
    })

    await deactivateOtherProviderTokens(input.provider, doc._id.toString(), adminId)
    const refreshed = await getAiTokenOr404(doc._id.toString(), true)
    return sanitizeAiToken(refreshed)
  },

  async update(id: string, input: AiTokenUpdateInput, adminId: string) {
    const doc = await getAiTokenOr404(id)
    if (input.name !== undefined) doc.name = input.name
    if (input.description !== undefined) doc.description = input.description
    if (input.notes !== undefined) doc.notes = input.notes
    if (input.config !== undefined) {
      doc.config = {
        ...(doc.config ?? {}),
        ...input.config,
      }
    }
    doc.updatedBy = new Types.ObjectId(adminId)
    await doc.save()
    const refreshed = await getAiTokenOr404(id, true)
    return sanitizeAiToken(refreshed)
  },

  async activate(id: string, adminId: string) {
    const doc = await getAiTokenOr404(id)
    if (!doc.provider) throw new AppError('AI token provider is missing', 400)

    await deactivateOtherProviderTokens(doc.provider, doc._id.toString(), adminId)
    doc.isEnabled = true
    doc.isArchived = false
    doc.status = 'active'
    doc.updatedBy = new Types.ObjectId(adminId)
    if (!doc.lastValidatedAt) doc.lastValidatedAt = new Date()
    await doc.save()

    const refreshed = await getAiTokenOr404(id, true)
    return sanitizeAiToken(refreshed)
  },

  async archive(id: string, adminId: string) {
    const doc = await getAiTokenOr404(id)
    doc.isEnabled = false
    doc.isArchived = true
    doc.status = 'inactive'
    doc.updatedBy = new Types.ObjectId(adminId)
    await doc.save()
    const refreshed = await getAiTokenOr404(id, true)
    return sanitizeAiToken(refreshed)
  },

  async remove(id: string) {
    const doc = await getAiTokenOr404(id)
    await doc.deleteOne()
  },

  async test(id: string) {
    const doc = await getAiTokenOr404(id, true)
    const hasSecret = Boolean(doc.apiKey && doc.apiKey.trim().length > 0)
    const success = hasSecret

    doc.isValid = success
    doc.validationError = success ? null : 'Missing API token'
    doc.lastValidatedAt = new Date()
    doc.status = success && doc.isEnabled ? 'active' : success ? 'inactive' : 'error'
    doc.syncStatus = success ? 'success' : 'error'
    if (!success) doc.lastError = new Date()
    await doc.save()

    return {
      success,
      message: success ? 'AI token validation successful' : 'AI token validation failed',
      token: sanitizeAiToken(doc),
    }
  },

  async getRawActiveToken(provider: AiProvider) {
    const doc = await Integration.findOne({
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
      provider,
      isEnabled: true,
      isArchived: false,
      isValid: true,
    }).select('+apiKey')

    if (!doc?.apiKey) return null
    return {
      token: doc.apiKey,
      config: doc.config ?? {},
      integrationId: doc._id.toString(),
    }
  },

  async markUsage(provider: AiProvider) {
    const doc = await Integration.findOne({
      integrationType: AI_TOKEN_INTEGRATION_TYPE,
      provider,
      isEnabled: true,
      isArchived: false,
      isValid: true,
    })
    if (!doc) return

    doc.lastUsedAt = new Date()
    doc.usageCount = (doc.usageCount ?? 0) + 1
    await doc.save()
  },

  async stats() {
    const docs = await Integration.find({ integrationType: AI_TOKEN_INTEGRATION_TYPE }).lean()

    const byProvider: Record<string, { total: number; active: number; archived: number; invalid: number; totalUsage: number }> = {}
    for (const doc of docs) {
      const provider = doc.provider ?? 'unknown'
      if (!byProvider[provider]) {
        byProvider[provider] = { total: 0, active: 0, archived: 0, invalid: 0, totalUsage: 0 }
      }

      byProvider[provider].total += 1
      if (doc.isEnabled && !doc.isArchived) byProvider[provider].active += 1
      if (doc.isArchived) byProvider[provider].archived += 1
      if (!doc.isValid) byProvider[provider].invalid += 1
      byProvider[provider].totalUsage += doc.usageCount ?? 0
    }

    return {
      total: docs.length,
      providers: byProvider,
    }
  },
}

