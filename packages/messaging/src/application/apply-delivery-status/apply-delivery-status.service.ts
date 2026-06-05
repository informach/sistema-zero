import type { Message } from '../../domain/message/message.aggregate'
import { ConcurrencyConflictError } from '../../domain/ports/concurrency.error'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import type { SuppressionRepository } from '../../domain/ports/suppression-repository.port'
import type { WebhookInboxRepository } from '../../domain/ports/webhook-inbox.port'
import type { Logger } from '../../infrastructure/logging/logger'

/** Ação normalizada derivada do evento do provedor. */
export type StatusAction =
  | 'delivered'
  | 'read'
  | 'failed'
  | 'suppress_bounce'
  | 'suppress_spam'
  | 'suppress_unsub'
  | 'ignore'

export interface DeliveryStatusInput {
  provider: 'sendgrid' | 'evolution'
  /** Id único do evento para dedupe (sg_event_id / `keyId:status`). */
  providerEventId: string
  eventType: string
  providerMessageId: string | null
  action: StatusAction
  occurredAt: Date
  payload: Record<string, unknown>
}

export interface DeliveryStatusResult {
  deduped: boolean
  applied: boolean
}

/** Re-tentativas locais quando o update conflita com o worker (corrida benigna). */
const MAX_APPLY_ATTEMPTS = 3

/**
 * Aplica um evento de STATUS (entregue/lido/bounce/spam) à mensagem. Provider-
 * agnóstico: as rotas de webhook normalizam o payload do provedor numa `action`.
 *
 * Ordem do dedupe (importante): o evento só é MARCADO no inbox DEPOIS de
 * aplicado — marcar antes fazia uma falha no meio (ex.: conflito de versão com o
 * worker) "consumir" o evento: a reentrega do provedor caía no dedupe e o status
 * se perdia. Conflito de versão → recarrega e re-aplica (as transições do webhook
 * são tolerantes/idempotentes, então reprocessar é seguro).
 */
export class ApplyDeliveryStatusService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly suppressions: SuppressionRepository,
    private readonly webhookInbox: WebhookInboxRepository,
    private readonly logger: Logger,
  ) {}

  async execute(input: DeliveryStatusInput): Promise<DeliveryStatusResult> {
    if (input.action === 'ignore') return { deduped: false, applied: false }

    // Gate de LEITURA: já processado → reentrega legítima, nada a fazer.
    if (await this.webhookInbox.alreadyReceived(input.provider, input.providerEventId)) {
      return { deduped: true, applied: false }
    }

    let message = input.providerMessageId
      ? await this.messages.findByProviderMessageId(input.providerMessageId)
      : null

    // Sem mensagem (ex.: status chegou antes de persistirmos o envio): NÃO marca
    // como recebido, para uma reentrega futura ser processada quando a msg existir.
    if (!message) {
      this.logger.warn('webhook.message_not_found', {
        provider: input.provider,
        providerMessageId: input.providerMessageId,
        eventType: input.eventType,
      })
      return { deduped: false, applied: false }
    }

    let changed = false
    for (let attempt = 1; ; attempt++) {
      changed = await this.apply(message, input)
      if (!changed) break
      try {
        await this.messages.update(message)
        break
      } catch (error) {
        if (!(error instanceof ConcurrencyConflictError) || attempt >= MAX_APPLY_ATTEMPTS) {
          throw error // sem markReceived → a reentrega do provedor reprocessa
        }
        const fresh = await this.messages.findById(message.id)
        if (!fresh) return { deduped: false, applied: false }
        message = fresh
      }
    }

    // Marca como processado por ÚLTIMO: falha aqui → reentrega re-aplica (no-op
    // pelas transições tolerantes) e marca de novo.
    await this.webhookInbox.markReceived({
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      messageId: message.id,
      payload: input.payload,
    })
    return { deduped: false, applied: changed }
  }

  private async apply(message: Message, input: DeliveryStatusInput): Promise<boolean> {
    const now = input.occurredAt
    switch (input.action) {
      case 'delivered':
        return message.markDelivered(now)
      case 'read':
        return message.markRead(now)
      case 'failed':
        message.markFailed({ reason: input.eventType, code: input.provider, now })
        return true
      default: {
        // suppress_bounce | suppress_spam | suppress_unsub
        const address =
          message.channel === 'email' ? message.recipient.email : message.recipient.phone
        if (address) await this.suppressions.add(message.channel, address, input.action)
        message.suppress({ reason: input.action, now })
        return true
      }
    }
  }
}
