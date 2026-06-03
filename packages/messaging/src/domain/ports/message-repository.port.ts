import type { Message } from '../message/message.aggregate'
import type { MessageStatus } from '../message/message.status'
import type { Channel } from '../shared/channel'

export interface ListMessagesQuery {
  channel?: Channel
  status?: MessageStatus
  limit: number
  offset: number
}

export interface MessageRepository {
  /** Insere a mensagem e grava seus eventos no outbox (mesma transação) + NOTIFY. */
  create(message: Message): Promise<void>
  /** Atualização com concorrência otimista + grava novos eventos no outbox. */
  update(message: Message): Promise<void>
  findById(id: string): Promise<Message | null>
  /** Match de webhook de status (id atribuído pelo provedor). */
  findByProviderMessageId(providerMessageId: string): Promise<Message | null>
  /** Dedupe da SOLICITAÇÃO de envio (idempotência por consumidor). */
  findByIdempotency(consumerId: string, idempotencyKey: string): Promise<Message | null>
  /** Listagem paginada para o painel admin. */
  listForAdmin(query: ListMessagesQuery): Promise<{ items: Message[]; total: number }>

  /**
   * Reivindica (atômico, `FOR UPDATE SKIP LOCKED`) até `limit` e-mails DEVIDOS,
   * marcando-os SENDING. Seguro com várias réplicas. Retorna os agregados em SENDING.
   */
  claimDueEmail(limit: number, now: Date): Promise<Message[]>
  /** Reivindica UMA mensagem de WhatsApp devida (SKIP LOCKED), marcando SENDING. */
  claimNextWhatsApp(now: Date): Promise<Message | null>
}
