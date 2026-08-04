import type { AiProvider } from '../models/Integration.js'

export type AiGenerationRequest = {
  prompt: string
  systemPrompt?: string
  model: string
  temperature?: number
  maxTokens?: number
  timeout?: number
  json?: boolean
}

export type AiGenerationResult = {
  text: string
  model: string
  provider: AiProvider
}

export type ResolvedAiProviderConfig = {
  provider: AiProvider
  source: 'integration' | 'env'
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  timeout: number
  endpoint?: string
  deployment?: string
}

