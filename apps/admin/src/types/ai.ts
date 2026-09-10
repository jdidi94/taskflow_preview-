export type AiProvider = 'google' | 'openai' | 'anthropic' | 'azure' | 'groq'
export type AiTokenStatus = 'active' | 'inactive' | 'archived' | 'invalid'

export type AiToken = {
  _id: string
  id?: string
  provider: AiProvider | string
  name: string
  description?: string
  status: AiTokenStatus | string
  maskedToken: string
  config?: {
    model?: string
    maxTokens?: number
    temperature?: number
    timeout?: number
  }
  notes?: string | null
  isActive: boolean
  isArchived?: boolean
  isValid?: boolean
  validationError?: string | null
  lastValidatedAt?: string | null
  lastUsedAt?: string | null
  usageCount?: number
  createdAt: string
  updatedAt?: string
}

export type AiTokenTestResult = {
  success: boolean
  message: string
  token: AiToken
}

export type AiTokenProviderStat = {
  total: number
  active: number
  archived: number
  invalid: number
  totalUsage: number
}

export type AiTokenStats = {
  total: number
  providers: Record<string, AiTokenProviderStat>
}

export type CreateAiTokenInput = {
  name: string
  description?: string
  token: string
  provider: AiProvider
  config?: {
    model?: string
    maxTokens?: number
    temperature?: number
    timeout?: number
  }
}
