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

/**
 * Aplica um evento de STATUS (entregue/lido/bounce/spam) à mensagem. Provider-
 * agnóstico: as rotas de webhook normalizam o payload do provedor numa `action`.
 * Dedupe via `webhookInbox`. Em bounce/spam/unsub, adiciona o destinatário à
 * supressão (não reenviar). Idempotente (transições tolerantes na agregada).
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

    const message = input.providerMessageId
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

    const isNew = await this.webhookInbox.markReceived({
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      messageId: message.id,
      payload: input.payload,
    })
    if (!isNew) return { deduped: true, applied: false }

    const now = input.occurredAt
    let changed = false
    switch (input.action) {
      case 'delivered':
        changed = message.markDelivered(now)
        break
      case 'read':
        changed = message.markRead(now)
        break
      case 'failed':
        message.markFailed({ reason: input.eventType, code: input.provider, now })
        changed = true
        break
      default: {
        // suppress_bounce | suppress_spam | suppress_unsub
        const address =
          message.channel === 'email' ? message.recipient.email : message.recipient.phone
        if (address) await this.suppressions.add(message.channel, address, input.action)
        message.suppress({ reason: input.action, now })
        changed = true
        break
      }
    }

    if (changed) await this.messages.update(message)
    return { deduped: false, applied: changed }
  }
}
