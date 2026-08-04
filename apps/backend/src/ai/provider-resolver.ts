import { env } from '../config/env.js'
import type { AiProvider } from '../models/Integration.js'
import { aiTokenService } from '../services/aiToken.service.js'
import { generateAnthropicText } from './anthropic.client.js'
import { generateAzureOpenAIText } from './azure-openai.client.js'
import { generateGoogleAiText } from './google-ai.client.js'
import { generateOpenAIText } from './openai.client.js'
import type { AiGenerationRequest, AiGenerationResult, ResolvedAiProviderConfig } from './types.js'

const PROVIDER_ORDER: AiProvider[] = ['openai', 'google', 'anthropic', 'azure']

function getNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function getString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function buildIntegrationConfig(provider: AiProvider, tokenData: { token: string; config: Record<string, unknown> }): ResolvedAiProviderConfig {
  const config = tokenData.config ?? {}

  switch (provider) {
    case 'openai':
      return {
        provider,
        source: 'integration',
        apiKey: tokenData.token,
        model: getString(config.model, env.OPENAI_MODEL),
        temperature: getNumber(config.temperature, 0.3),
        maxTokens: getNumber(config.maxTokens, 2000),
        timeout: getNumber(config.timeout, 30000),
      }
    case 'anthropic':
      return {
        provider,
        source: 'integration',
        apiKey: tokenData.token,
        model: getString(config.model, env.ANTHROPIC_MODEL),
        temperature: getNumber(config.temperature, 0.3),
        maxTokens: getNumber(config.maxTokens, 2000),
        timeout: getNumber(config.timeout, 30000),
      }
    case 'azure':
      return {
        provider,
        source: 'integration',
        apiKey: tokenData.token,
        model: getString(config.model, env.AZURE_OPENAI_DEPLOYMENT),
        deployment: getString(config.deployment, env.AZURE_OPENAI_DEPLOYMENT),
        endpoint: getString(config.endpoint, env.AZURE_OPENAI_ENDPOINT),
        temperature: getNumber(config.temperature, 0.3),
        maxTokens: getNumber(config.maxTokens, 2000),
        timeout: getNumber(config.timeout, 30000),
      }
    case 'google':
    default:
      return {
        provider,
        source: 'integration',
        apiKey: tokenData.token,
        model: getString(config.model, env.GOOGLE_GEMINI_MODEL),
        temperature: getNumber(config.temperature, 0.3),
        maxTokens: getNumber(config.maxTokens, 2000),
        timeout: getNumber(config.timeout, 30000),
      }
  }
}

function getEnvConfig(provider: AiProvider): ResolvedAiProviderConfig | null {
  switch (provider) {
    case 'openai':
      if (!env.OPENAI_API_KEY) return null
      return {
        provider,
        source: 'env',
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
      }
    case 'google':
      if (!env.GOOGLE_API_GEMINI_API_KEY) return null
      return {
        provider,
        source: 'env',
        apiKey: env.GOOGLE_API_GEMINI_API_KEY,
        model: env.GOOGLE_GEMINI_MODEL,
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
      }
    case 'anthropic':
      if (!env.ANTHROPIC_API_KEY) return null
      return {
        provider,
        source: 'env',
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.ANTHROPIC_MODEL,
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
      }
    case 'azure':
      if (!env.AZURE_OPENAI_API_KEY || !env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT) return null
      return {
        provider,
        source: 'env',
        apiKey: env.AZURE_OPENAI_API_KEY,
        model: env.AZURE_OPENAI_DEPLOYMENT,
        deployment: env.AZURE_OPENAI_DEPLOYMENT,
        endpoint: env.AZURE_OPENAI_ENDPOINT,
        temperature: 0.3,
        maxTokens: 2000,
        timeout: 30000,
      }
  }
}

function uniqueProviderOrder(preferredProvider?: AiProvider): AiProvider[] {
  const ordered = [preferredProvider, env.DEFAULT_AI_PROVIDER as AiProvider, ...PROVIDER_ORDER].filter(Boolean) as AiProvider[]
  return ordered.filter((provider, index) => ordered.indexOf(provider) === index)
}

export async function resolveAiProvider(preferredProvider?: AiProvider): Promise<ResolvedAiProviderConfig | null> {
  for (const provider of uniqueProviderOrder(preferredProvider)) {
    const tokenData = await aiTokenService.getRawActiveToken(provider)
    if (tokenData) return buildIntegrationConfig(provider, tokenData)

    const envConfig = getEnvConfig(provider)
    if (envConfig) return envConfig
  }

  return null
}

export async function generateAiText(
  request: Omit<AiGenerationRequest, 'model'> & { preferredProvider?: AiProvider; model?: string },
): Promise<(AiGenerationResult & { source: 'integration' | 'env' }) | null> {
  const resolved = await resolveAiProvider(request.preferredProvider)
  if (!resolved) return null

  const finalRequest: AiGenerationRequest = {
    ...request,
    model: request.model ?? resolved.model,
    temperature: request.temperature ?? resolved.temperature,
    maxTokens: request.maxTokens ?? resolved.maxTokens,
    timeout: request.timeout ?? resolved.timeout,
  }

  let result: AiGenerationResult
  switch (resolved.provider) {
    case 'openai':
      result = await generateOpenAIText(resolved.apiKey, finalRequest)
      break
    case 'anthropic':
      result = await generateAnthropicText(resolved.apiKey, finalRequest)
      break
    case 'azure':
      if (!resolved.endpoint || !resolved.deployment) {
        throw new Error('Azure OpenAI requires endpoint and deployment')
      }
      result = await generateAzureOpenAIText(
        resolved.apiKey,
        resolved.endpoint,
        resolved.deployment,
        finalRequest,
      )
      break
    case 'google':
    default:
      result = await generateGoogleAiText(resolved.apiKey, finalRequest)
      break
  }

  if (resolved.source === 'integration') {
    await aiTokenService.markUsage(resolved.provider)
  }

  return { ...result, source: resolved.source }
}

