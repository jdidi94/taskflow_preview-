import type { AiGenerationRequest, AiGenerationResult } from './types.js'

export async function generateAzureOpenAIText(
  apiKey: string,
  endpoint: string,
  deployment: string,
  request: AiGenerationRequest,
): Promise<AiGenerationResult> {
  const controller = new AbortController()
  const timeoutMs = request.timeout ?? 30000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const base = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint
    const url = `${base}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2024-06-01`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 2000,
        response_format: request.json ? { type: 'json_object' } : undefined,
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
      }),
      signal: controller.signal,
    })

    const json = (await response.json()) as any
    if (!response.ok) {
      throw new Error(json?.error?.message ?? 'Azure OpenAI request failed')
    }

    const text = json?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Azure OpenAI returned an empty response')
    }

    return {
      text,
      model: deployment,
      provider: 'azure',
    }
  } finally {
    clearTimeout(timer)
  }
}

