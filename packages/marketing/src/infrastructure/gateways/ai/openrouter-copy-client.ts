import { type AiCompleteInput, type AiCopyApi, AiCopyError } from './ai-copy.port'

/**
 * Cliente OpenRouter (chat/completions com `response_format: json_schema`) —
 * molde do pensa-llm do member-shell + dos clients de gateway daqui. Timeout
 * via AbortController+clearTimeout (NUNCA AbortSignal.timeout — pendura o bun
 * test). 1 retry com nudge quando o JSON vem cortado/fora do contrato; 4xx do
 * upstream (chave inválida) NÃO melhora com retry.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export interface OpenRouterCopyConfig {
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

export class OpenRouterCopyClient implements AiCopyApi {
  constructor(private readonly config: OpenRouterCopyConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.model)
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.config.apiKey}`,
      'content-type': 'application/json',
      'x-title': 'Sistema Zero Marketing',
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
      throw new AiCopyError('Falha de rede ao falar com a IA', 'unavailable', { cause: error })
    } finally {
      clearTimeout(timer)
    }
    const json = (await res.json().catch(() => ({}))) as ChatResponse
    if (!res.ok || json.error) {
      // Falha HTTP (chave/modelo inválidos, rate, 5xx): o service traduz p/ 502.
      // O nudge de reparo só serve p/ JSON cortado — erro HTTP não re-tenta.
      throw new AiCopyError(
        `OpenRouter ${res.status}: ${json.error?.message ?? 'erro'}`.slice(0, 300),
        'unavailable',
      )
    }
    return json
  }

  async complete<T>(input: AiCompleteInput<T>): Promise<T> {
    if (!this.isConfigured()) throw new AiCopyError('IA não configurada', 'not_configured')
    const baseMessages = [
      { role: 'system' as const, content: input.system },
      { role: 'user' as const, content: input.user },
    ]
    const responseFormat = {
      type: 'json_schema' as const,
      json_schema: { name: input.schemaName, strict: true, schema: input.jsonSchema },
    }

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
                  'Sua resposta anterior veio cortada ou fora do formato. Responda AGORA um único objeto JSON válido e completo, seguindo o schema.',
              },
            ]
      try {
        const data = await this.post({
          model: this.config.model,
          messages,
          stream: false,
          temperature: 0.5,
          max_tokens: this.config.maxTokens,
          response_format: responseFormat,
        })
        const content = data.choices?.[0]?.message?.content
        if (typeof content !== 'string' || !content.trim()) {
          throw new AiCopyError('A IA devolveu resposta vazia', 'invalid_output')
        }
        const parsed = input.schema.safeParse(JSON.parse(content))
        if (!parsed.success) {
          throw new AiCopyError('A IA devolveu um JSON fora do contrato', 'invalid_output')
        }
        return parsed.data
      } catch (error) {
        lastError = error
        // SÓ o parse (JSON cortado / fora do contrato) merece o nudge de reparo;
        // falha HTTP/rede (unavailable/not_configured) propaga na hora.
        const isParseFailure =
          error instanceof SyntaxError ||
          (error instanceof AiCopyError && error.kind === 'invalid_output')
        if (!isParseFailure) throw error
      }
    }
    if (lastError instanceof AiCopyError) throw lastError
    throw new AiCopyError('A IA não devolveu um resultado válido', 'invalid_output', {
      cause: lastError,
    })
  }
}
