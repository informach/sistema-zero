import { MessageNotFoundError } from '../../domain/message/message.errors'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { type MessageView, toMessageView } from '../mappers/message-view'

export class GetMessageService {
  constructor(private readonly messages: MessageRepository) {}
  async byIntent(consumerId: string, intentId: string): Promise<MessageView> {
    const message = await this.messages.findByIdempotency(consumerId, intentId)
    if (!message) throw new MessageNotFoundError('Solicitação não encontrada')
    return toMessageView(message)
  }

  async execute(id: string, consumerId?: string | null): Promise<MessageView> {
    const message = await this.messages.findById(id)
    if (!message) throw new MessageNotFoundError(`Mensagem ${id} não encontrada`)
    if (consumerId && message.state.consumerId !== consumerId) {
      throw new MessageNotFoundError(`Mensagem ${id} não encontrada`)
    }
    return toMessageView(message)
  }
}
