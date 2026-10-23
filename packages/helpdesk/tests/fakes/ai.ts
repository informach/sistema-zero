import {
  type LlmClient,
  type LlmCompleteInput,
  LlmError,
} from '../../src/domain/ports/llm-client.port'

/**
 * LLM fake: fila de respostas (o service chama classify→draft nessa ordem).
 * `configured=false` simula falta de chave; `error` simula falha do upstream.
 */
export class FakeLlmClient implements LlmClient {
  configured = true
  queue: unknown[] = []
  error: LlmError | null = null
  calls: LlmCompleteInput<unknown>[] = []

  isConfigured(): boolean {
    return this.configured
  }

  async complete<T>(input: LlmCompleteInput<T>): Promise<T> {
    this.calls.push(input as LlmCompleteInput<unknown>)
    if (this.error) throw this.error
    if (this.queue.length === 0) throw new LlmError('FakeLlm: fila vazia', 'invalid_output')
    await input.beforeAttempt?.(1)
    const result = input.schema.parse(await this.queue.shift())
    await input.onAttempt?.({
      attempt: 1,
      model: 'fake',
      providerId: null,
      inputTokens: null,
      outputTokens: null,
      costUsd: null,
      durationMs: 0,
      outcome: 'completed',
    })
    return result
  }
}
