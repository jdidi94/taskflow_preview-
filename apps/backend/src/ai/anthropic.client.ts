import type { AiGenerationRequest, AiGenerationResult } from './types.js'

export async function generateAnthropicText(
  apiKey: string,
  request: AiGenerationRequest,
): Promise<AiGenerationResult> {
  const controller = new AbortController()
  const timeoutMs = request.timeout ?? 30000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        system: request.systemPrompt,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 2000,
        messages: [{ role: 'user', content: request.prompt }],
      }),
      signal: controller.signal,
    })

    const json = (await response.json()) as any
    if (!response.ok) {
      throw new Error(json?.error?.message ?? 'Anthropic request failed')
    }

    const text = Array.isArray(json?.content)
      ? json.content
          .filter((entry: any) => entry?.type === 'text')
          .map((entry: any) => entry?.text ?? '')
          .join('\n')
      : ''

    if (!text.trim()) {
      throw new Error('Anthropic returned an empty response')
    }

    return {
      text,
      model: json?.model ?? request.model,
      provider: 'anthropic',
    }
  } finally {
    clearTimeout(timer)
  }
}

