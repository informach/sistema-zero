import type { Logger } from '@sistemazero/core/logging'
import type { WhatsAppInstance } from '../../src/domain/lane/whatsapp-instance.aggregate'
import type { Message } from '../../src/domain/message/message.aggregate'
import type {
  ListMessagesQuery,
  MessageRepository,
} from '../../src/domain/ports/message-repository.port'
import type { SenderRepository } from '../../src/domain/ports/sender-repository.port'
import type { SuppressionRepository } from '../../src/domain/ports/suppression-repository.port'
import type {
  ListTemplatesQuery,
  TemplateRepository,
} from '../../src/domain/ports/template-repository.port'
import type {
  MarkReceivedInput,
  WebhookInboxRepository,
} from '../../src/domain/ports/webhook-inbox.port'
import type { WhatsAppInstanceRepository } from '../../src/domain/ports/whatsapp-instance-repository.port'
import type { EmailSender } from '../../src/domain/sender/email-sender.aggregate'
import {
  isLaneAvailable,
  type PacingConfig,
  type PacingUpdate,
} from '../../src/domain/services/pacing'
import type { Channel } from '../../src/domain/shared/channel'
import type { Template } from '../../src/domain/template/template.aggregate'

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

export class InMemoryTemplateRepository implements TemplateRepository {
  readonly store = new Map<string, Template>()

  async create(t: Template): Promise<void> {
    this.store.set(t.id, t)
  }
  async update(t: Template): Promise<void> {
    this.store.set(t.id, t)
  }
  async findById(id: string): Promise<Template | null> {
    return this.store.get(id) ?? null
  }
  async findByChannelAndKey(channel: Channel, key: string): Promise<Template | null> {
    for (const t of this.store.values()) {
      if (t.channel === channel && t.key === key) return t
    }
    return null
  }
  async list(query: ListTemplatesQuery): Promise<{ items: Template[]; total: number }> {
    let items = [...this.store.values()]
    if (query.channel) items = items.filter((t) => t.channel === query.channel)
    return {
      items: items.slice(query.offset, query.offset + query.limit),
      total: items.length,
    }
  }
}

export interface CapturedEvent {
  eventName: string
  aggregateId: string
}

export class InMemoryMessageRepository implements MessageRepository {
  readonly store = new Map<string, Message>()
  readonly events: CapturedEvent[] = []

  private drain(m: Message): void {
    for (const e of m.pullEvents()) {
      this.events.push({ eventName: e.eventName, aggregateId: e.aggregateId })
    }
  }

  async create(m: Message): Promise<void> {
    this.store.set(m.id, m)
    this.drain(m)
  }
  async update(m: Message): Promise<void> {
    this.store.set(m.id, m)
    this.drain(m)
  }
  async findById(id: string): Promise<Message | null> {
    return this.store.get(id) ?? null
  }
  async findByProviderMessageId(providerMessageId: string): Promise<Message | null> {
    for (const m of this.store.values()) {
      if (m.state.providerMessageId === providerMessageId) return m
    }
    return null
  }
  async findByIdempotency(consumerId: string, idempotencyKey: string): Promise<Message | null> {
    for (const m of this.store.values()) {
      if (m.state.consumerId === consumerId && m.state.idempotencyKey === idempotencyKey) return m
    }
    return null
  }
  async listForAdmin(query: ListMessagesQuery): Promise<{ items: Message[]; total: number }> {
    let items = [...this.store.values()]
    if (query.channel) items = items.filter((m) => m.channel === query.channel)
    if (query.status) items = items.filter((m) => m.status === query.status)
    return { items: items.slice(query.offset, query.offset + query.limit), total: items.length }
  }

  private due(channel: Channel, now: Date): Message[] {
    return [...this.store.values()]
      .filter(
        (m) =>
          m.channel === channel &&
          (m.status === 'QUEUED' || m.status === 'SCHEDULED') &&
          m.state.scheduledAt.getTime() <= now.getTime() &&
          m.state.nextAttemptAt.getTime() <= now.getTime(),
      )
      .sort(
        (a, b) =>
          b.state.priority - a.state.priority ||
          a.state.scheduledAt.getTime() - b.state.scheduledAt.getTime(),
      )
  }

  async claimDueEmail(limit: number, now: Date): Promise<Message[]> {
    const batch = this.due('email', now).slice(0, limit)
    for (const m of batch) m.startSending()
    return batch
  }

  async claimNextWhatsApp(now: Date): Promise<Message | null> {
    const next = this.due('whatsapp', now)[0]
    if (!next) return null
    next.startSending()
    return next
  }
}

export class InMemorySenderRepository implements SenderRepository {
  readonly store = new Map<string, EmailSender>()

  async create(s: EmailSender): Promise<void> {
    this.store.set(s.id, s)
  }
  async update(s: EmailSender): Promise<void> {
    this.store.set(s.id, s)
  }
  async findById(id: string): Promise<EmailSender | null> {
    return this.store.get(id) ?? null
  }
  async findByEmail(fromEmail: string): Promise<EmailSender | null> {
    const needle = fromEmail.trim().toLowerCase()
    for (const s of this.store.values()) {
      if (s.fromEmail === needle) return s
    }
    return null
  }
  async findDefault(): Promise<EmailSender | null> {
    for (const s of this.store.values()) {
      if (s.isDefault && s.enabled) return s
    }
    return null
  }
  async clearDefault(): Promise<void> {
    for (const s of this.store.values()) {
      if (s.isDefault) s.update({ isDefault: false }, new Date())
    }
  }
  async list(query: { limit: number; offset: number }): Promise<{
    items: EmailSender[]
    total: number
  }> {
    const items = [...this.store.values()]
    return { items: items.slice(query.offset, query.offset + query.limit), total: items.length }
  }
}

export class InMemoryWhatsAppInstanceRepository implements WhatsAppInstanceRepository {
  readonly store = new Map<string, WhatsAppInstance>()

  async create(i: WhatsAppInstance): Promise<void> {
    this.store.set(i.id, i)
  }
  async update(i: WhatsAppInstance): Promise<void> {
    this.store.set(i.id, i)
  }
  async findById(id: string): Promise<WhatsAppInstance | null> {
    return this.store.get(id) ?? null
  }
  async findByInstanceName(instanceName: string): Promise<WhatsAppInstance | null> {
    for (const i of this.store.values()) {
      if (i.instanceName === instanceName) return i
    }
    return null
  }
  async list(query: { limit: number; offset: number }): Promise<{
    items: WhatsAppInstance[]
    total: number
  }> {
    const items = [...this.store.values()]
    return { items: items.slice(query.offset, query.offset + query.limit), total: items.length }
  }

  async reserveAvailableLane(
    now: Date,
    leaseMs: number,
    config: PacingConfig,
  ): Promise<WhatsAppInstance | null> {
    const lane = [...this.store.values()]
      .filter((i) => isLaneAvailable(i.snapshot(), config, now))
      .sort((a, b) => a.state.nextAvailableAt.getTime() - b.state.nextAvailableAt.getTime())[0]
    if (!lane) return null
    lane.setNextAvailableAt(new Date(now.getTime() + leaseMs), now)
    return lane
  }

  async applyLanePacing(id: string, update: PacingUpdate): Promise<void> {
    this.store.get(id)?.applyPacing(update, new Date())
  }

  async delayLane(id: string, until: Date): Promise<void> {
    this.store.get(id)?.setNextAvailableAt(until, new Date())
  }
}

export class InMemorySuppressionRepository implements SuppressionRepository {
  readonly store = new Set<string>()

  private key(channel: Channel, address: string): string {
    return `${channel}:${address}`
  }
  async isSuppressed(channel: Channel, address: string): Promise<boolean> {
    return this.store.has(this.key(channel, address))
  }
  async add(channel: Channel, address: string, _reason: string): Promise<void> {
    this.store.add(this.key(channel, address))
  }
}

export class InMemoryWebhookInbox implements WebhookInboxRepository {
  readonly seen = new Set<string>()

  async markReceived(input: MarkReceivedInput): Promise<boolean> {
    const key = `${input.provider}:${input.providerEventId}`
    if (this.seen.has(key)) return false
    this.seen.add(key)
    return true
  }
  async cleanup(): Promise<number> {
    return 0
  }
}
