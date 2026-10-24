import { Message } from '../../domain/message/message.aggregate'
import { IdempotencyConflictError, MessageNotFoundError } from '../../domain/message/message.errors'
import type { Clock } from '../../domain/ports/clock.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { toMessageView } from '../mappers/message-view'
import { assertSameMessageIntent } from '../send-message/message-intent'
import type { SendMessageInput } from '../send-message/send-message.service'

/** Retira apenas o que ainda está na fila; nunca promete desfazer envio iniciado. */
export class SuppressMessageService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly clock: Clock,
  ) {}
  /** The unique consumer/key index serializes withdrawal against an in-flight enqueue. */
  async executeIntent(input: SendMessageInput & { consumerId: string; idempotencyKey: string }) {
    let message = await this.messages.findByIdempotency(input.consumerId, input.idempotencyKey)
    if (!message) {
      const tombstone = Message.withdrawnIntent({
        ...input,
        id: crypto.randomUUID(),
        now: this.clock.now(),
      })
      try {
        await this.messages.create(tombstone)
        return { suppressed: true, message: toMessageView(tombstone) }
      } catch (error) {
        if (!(error instanceof IdempotencyConflictError)) throw error
        message = await this.messages.findByIdempotency(input.consumerId, input.idempotencyKey)
        if (!message) throw error
      }
    }
    assertSameMessageIntent(message, input)
    return this.execute(message.id, input.consumerId)
  }
  async execute(id: string, consumerId: string) {
    const message = await this.messages.findById(id)
    if (!message || message.state.consumerId !== consumerId)
      throw new MessageNotFoundError('Mensagem não encontrada')
    const changed = message.withdrawQueued(this.clock.now())
    if (changed) await this.messages.withdrawQueued(message)
    // A escrita compara fila + versão; perder a corrida para o worker não é sucesso.
    return { suppressed: message.status === 'SUPPRESSED', message: toMessageView(message) }
  }
}
