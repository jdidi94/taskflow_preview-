import type { AiGenerationRequest, AiGenerationResult } from './types.js'

export async function generateGoogleAiText(
  apiKey: string,
  request: AiGenerationRequest,
): Promise<AiGenerationResult> {
  const controller = new AbortController()
  const timeoutMs = request.timeout ?? 30000
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const model = request.model || 'gemini-3.1-flash-lite'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: request.systemPrompt
          ? {
              parts: [{ text: request.systemPrompt }],
            }
          : undefined,
        contents: [
          {
            role: 'user',
            parts: [{ text: request.prompt }],
          },
        ],
        generationConfig: {
          temperature: request.temperature ?? 0.3,
          maxOutputTokens: request.maxTokens ?? 2000,
          responseMimeType: request.json ? 'application/json' : 'text/plain',
        },
      }),
      signal: controller.signal,
    })

    const json = (await response.json()) as any
    if (!response.ok) {
      throw new Error(json?.error?.message ?? 'Google AI request failed')
    }

    const text = json?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? '').join('\n')
    if (typeof text !== 'string' || !text.trim()) {
      throw new Error('Google AI returned an empty response')
    }

    return {
      text,
      model,
      provider: 'google',
    }
  } finally {
    clearTimeout(timer)
  }
}

