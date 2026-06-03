import type { Channel } from '../shared/channel'
import { DomainEvent } from '../shared/domain-event'

interface BasePayload {
  messageId: string
  channel: Channel
  templateKey: string
}

export class MessageQueuedEvent extends DomainEvent {
  readonly eventName = 'message.queued'

  constructor(
    private readonly data: BasePayload & { scheduledAt: string },
    occurredAt?: Date,
  ) {
    super(data.messageId, occurredAt)
  }

  toPayload(): Record<string, unknown> {
    return { ...this.data }
  }
}

export class MessageSentEvent extends DomainEvent {
  readonly eventName = 'message.sent'

  constructor(
    private readonly data: BasePayload & { providerMessageId: string | null; sentAt: string },
    occurredAt?: Date,
  ) {
    super(data.messageId, occurredAt)
  }

  toPayload(): Record<string, unknown> {
    return { ...this.data }
  }
}

export class MessageDeliveredEvent extends DomainEvent {
  readonly eventName = 'message.delivered'

  constructor(
    private readonly data: BasePayload & { deliveredAt: string },
    occurredAt?: Date,
  ) {
    super(data.messageId, occurredAt)
  }

  toPayload(): Record<string, unknown> {
    return { ...this.data }
  }
}

export class MessageFailedEvent extends DomainEvent {
  readonly eventName = 'message.failed'

  constructor(
    private readonly data: BasePayload & { reason: string; code: string | null },
    occurredAt?: Date,
  ) {
    super(data.messageId, occurredAt)
  }

  toPayload(): Record<string, unknown> {
    return { ...this.data }
  }
}
