import type {
  ListMessagesQuery,
  MessageRepository,
} from '../../domain/ports/message-repository.port'
import { type MessageView, toMessageView } from '../mappers/message-view'

export class ListMessagesService {
  constructor(private readonly messages: MessageRepository) {}

  async execute(query: ListMessagesQuery): Promise<{ items: MessageView[]; total: number }> {
    const { items, total } = await this.messages.listForAdmin(query)
    return { items: items.map(toMessageView), total }
  }
}
