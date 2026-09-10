import type { AiGenerationRequest, AiGenerationResult } from './types.js'

export async function generateGroqText(
  apiKey: string,
  request: AiGenerationRequest,
): Promise<AiGenerationResult> {
  const controller = new AbortController()
  const timeoutMs = request.timeout ?? 30000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: request.model || 'llama-3.1-8b-instant',
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
      throw new Error(json?.error?.message ?? 'Groq request failed')
    }

    const text = json?.choices?.[0]?.message?.content
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Groq returned an empty response')
    }

    return {
      text,
      model: json?.model ?? request.model,
      provider: 'groq',
    }
  } finally {
    clearTimeout(timer)
  }
}
