import { MessageNotFoundError } from '../../domain/message/message.errors'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { type MessageView, toMessageView } from '../mappers/message-view'

export class GetMessageService {
  constructor(private readonly messages: MessageRepository) {}

  async execute(id: string): Promise<MessageView> {
    const message = await this.messages.findById(id)
    if (!message) throw new MessageNotFoundError(`Mensagem ${id} não encontrada`)
    return toMessageView(message)
  }
}
