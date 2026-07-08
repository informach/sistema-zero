import {
  type AiCompleteInput,
  type AiCopyApi,
  AiCopyError,
} from '../../src/infrastructure/gateways/ai/ai-copy.port'

/**
 * AiCopyApi roteirizável: devolve o `next` (validado pelo schema, como o real)
 * ou lança o `failWith`. `configured` liga/desliga o fail-soft.
 */
export class FakeAiCopyClient implements AiCopyApi {
  configured = true
  /** Próxima resposta (objeto que passa no schema do chamador). */
  next: unknown = null
  failWith: AiCopyError | null = null
  readonly calls: Array<{ system: string; user: string; schemaName: string }> = []

  isConfigured(): boolean {
    return this.configured
  }

  async complete<T>(input: AiCompleteInput<T>): Promise<T> {
    if (!this.configured) throw new AiCopyError('IA não configurada', 'not_configured')
    this.calls.push({ system: input.system, user: input.user, schemaName: input.schemaName })
    if (this.failWith) throw this.failWith
    const parsed = input.schema.safeParse(this.next)
    if (!parsed.success) {
      throw new AiCopyError('fake devolveu fora do contrato do teste', 'invalid_output')
    }
    return parsed.data
  }
}
