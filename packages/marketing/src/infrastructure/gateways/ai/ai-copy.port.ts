import type { ZodType } from 'zod'

/**
 * Porta fina sobre o LLM (OpenRouter) p/ a copy assistida. O AiCopyService
 * monta os prompts + o JSON Schema e chama `complete`; a impl real fica atrás
 * (fetch nativo). `not_configured` = sem chave (503); `unavailable` = erro do
 * upstream (502); `invalid_output` = a IA não devolveu JSON no contrato.
 */
export type AiCopyErrorKind = 'not_configured' | 'unavailable' | 'invalid_output'

export class AiCopyError extends Error {
  constructor(
    message: string,
    readonly kind: AiCopyErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AiCopyError'
  }
}

export interface AiCompleteInput<T> {
  system: string
  user: string
  /** Validador Zod da resposta (contrato do serviço). */
  schema: ZodType<T>
  /** JSON Schema (OpenRouter `response_format: json_schema`, strict). */
  jsonSchema: Record<string, unknown>
  schemaName: string
}

export interface AiCopyApi {
  /** Há chave/modelo configurados? (fail-soft: sem config o serviço responde 503). */
  isConfigured(): boolean
  /** Uma resposta estruturada validada pelo Zod (1 retry em JSON inválido). */
  complete<T>(input: AiCompleteInput<T>): Promise<T>
}
