import { MessageNotFoundError } from '../../domain/message/message.errors'
import type { Clock } from '../../domain/ports/clock.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { toMessageView } from '../mappers/message-view'

/** Retira apenas o que ainda está na fila; nunca promete desfazer envio iniciado. */
export class SuppressMessageService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly clock: Clock,
  ) {}
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
