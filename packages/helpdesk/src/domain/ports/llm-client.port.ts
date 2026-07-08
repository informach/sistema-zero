import type { ZodType } from 'zod'

/**
 * Porta fina sobre o LLM (OpenRouter) da IA do help desk. O TicketAiService monta
 * os prompts + o schema Zod e chama `complete`; a impl real fica atrás (fetch
 * nativo). Molde: OpenRouterCopyClient do marketing.
 *
 * `not_configured` = sem chave (503); `unavailable` = erro do upstream/rede (502);
 * `invalid_output` = a IA não devolveu JSON no contrato (502; o worker re-tenta).
 */
export type LlmErrorKind = 'not_configured' | 'unavailable' | 'invalid_output'

export class LlmError extends Error {
  constructor(
    message: string,
    readonly kind: LlmErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'LlmError'
  }
}

export interface LlmCompleteInput<T> {
  system: string
  user: string
  /** Validador Zod da resposta (contrato do serviço). */
  schema: ZodType<T>
  /** Rótulo p/ observabilidade/teste (ex.: 'classify', 'draft'). */
  label?: string
  maxTokens?: number
  temperature?: number
}

export interface LlmClient {
  /** Há chave/modelo configurados? (fail-soft: sem config a IA responde 503). */
  isConfigured(): boolean
  /** Uma resposta estruturada validada pelo Zod (1 retry em JSON inválido). */
  complete<T>(input: LlmCompleteInput<T>): Promise<T>
}
