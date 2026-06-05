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
   * marcando-os SENDING com um LEASE (`nextAttemptAt = now + leaseMs`). Mensagens
   * presas em SENDING com lease vencido são RE-reivindicadas (reaper — recupera
   * crash entre o claim e o update), incrementando `attempts` para garantir término.
   * Seguro com várias réplicas. Retorna os agregados em SENDING.
   */
  claimDueEmail(limit: number, now: Date, leaseMs: number): Promise<Message[]>
  /** Reivindica UMA mensagem de WhatsApp devida (SKIP LOCKED, mesmo lease/reaper). */
  claimNextWhatsApp(now: Date, leaseMs: number): Promise<Message | null>

  /**
   * Retenção: remove mensagens TERMINAIS (nunca QUEUED/SCHEDULED/SENDING) mais
   * antigas que `olderThan` — o `rendered_body` (~KBs por linha) cresceria sem
   * limite. Roda no ciclo periódico (advisory lock). Retorna linhas removidas.
   */
  cleanup(olderThan: Date): Promise<number>
}
