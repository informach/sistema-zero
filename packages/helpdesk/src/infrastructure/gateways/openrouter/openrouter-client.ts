import {
  type LlmClient,
  type LlmCompleteInput,
  LlmError,
} from '../../../domain/ports/llm-client.port'

/**
 * Cliente OpenRouter (chat/completions, `response_format: json_object`) — molde
 * do OpenRouterCopyClient do marketing. Timeout via AbortController+clearTimeout
 * (NUNCA AbortSignal.timeout — pendura o bun test). 1 retry com nudge quando o
 * JSON vem cortado/fora do contrato; erro HTTP (chave/rate/5xx) NÃO re-tenta.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface OpenRouterConfig {
  apiKey: string
  model: string
  referer: string | null
  maxTokens: number
  timeoutMs: number
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>
  error?: { message?: string; code?: number }
}

/** Remove cercas markdown (```json … ```) que alguns modelos ainda colocam. */
function stripFences(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

export class OpenRouterClient implements LlmClient {
  constructor(private readonly config: OpenRouterConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.model)
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.config.apiKey}`,
      'content-type': 'application/json',
      'x-title': 'Sistema Zero Helpdesk',
      ...(this.config.referer ? { 'http-referer': this.config.referer } : {}),
    }
  }

  private async post(body: unknown): Promise<ChatResponse> {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(new DOMException('openrouter timeout', 'TimeoutError')),
      this.config.timeoutMs,
    )
    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      throw new LlmError('Falha de rede ao falar com a IA', 'unavailable', { cause: error })
    } finally {
      clearTimeout(timer)
    }
    const json = (await res.json().catch(() => ({}))) as ChatResponse
    if (!res.ok || json.error) {
      throw new LlmError(
        `OpenRouter ${res.status}: ${json.error?.message ?? 'erro'}`.slice(0, 300),
        'unavailable',
      )
    }
    return json
  }

  async complete<T>(input: LlmCompleteInput<T>): Promise<T> {
    if (!this.isConfigured()) throw new LlmError('IA não configurada', 'not_configured')
    const baseMessages = [
      { role: 'system' as const, content: input.system },
      { role: 'user' as const, content: input.user },
    ]

    let lastError: unknown
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const messages =
        attempt === 0
          ? baseMessages
          : [
              ...baseMessages,
              {
                role: 'user' as const,
                content:
                  'Sua resposta anterior veio cortada ou fora do formato. Responda AGORA um único objeto JSON válido e completo, seguindo o contrato.',
              },
            ]
      try {
        const data = await this.post({
          model: this.config.model,
          messages,
          stream: false,
          temperature: input.temperature ?? 0.4,
          max_tokens: input.maxTokens ?? this.config.maxTokens,
          response_format: { type: 'json_object' },
        })
        const content = data.choices?.[0]?.message?.content
        if (typeof content !== 'string' || !content.trim()) {
          throw new LlmError('A IA devolveu resposta vazia', 'invalid_output')
        }
        const parsed = input.schema.safeParse(JSON.parse(stripFences(content)))
        if (!parsed.success) {
          throw new LlmError('A IA devolveu um JSON fora do contrato', 'invalid_output')
        }
        return parsed.data
      } catch (error) {
        lastError = error
        // SÓ o parse (JSON cortado / fora do contrato) merece o nudge de reparo;
        // falha HTTP/rede (unavailable/not_configured) propaga na hora.
        const isParseFailure =
          error instanceof SyntaxError ||
          (error instanceof LlmError && error.kind === 'invalid_output')
        if (!isParseFailure) throw error
      }
    }
    if (lastError instanceof LlmError) throw lastError
    throw new LlmError('A IA não devolveu um resultado válido', 'invalid_output', {
      cause: lastError,
    })
  }
}
