import type { Logger } from '@sistemazero/core/logging'
import type { WhatsAppInstance } from '../../src/domain/lane/whatsapp-instance.aggregate'
import { Message } from '../../src/domain/message/message.aggregate'
import { IdempotencyConflictError } from '../../src/domain/message/message.errors'
import { ConcurrencyConflictError } from '../../src/domain/ports/concurrency.error'
import type {
  ListMessagesQuery,
  MessageRepository,
} from '../../src/domain/ports/message-repository.port'
import type {
  SaveSenderOptions,
  SenderRepository,
} from '../../src/domain/ports/sender-repository.port'
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
import { normalizeAddress } from '../../src/domain/services/address'
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
  /** Injeção de falha: ids cujo PRÓXIMO update lança (consumido ao disparar). */
  readonly failNextUpdateFor = new Set<string>()

  private drain(m: Message): void {
    for (const e of m.pullEvents()) {
      this.events.push({ eventName: e.eventName, aggregateId: e.aggregateId })
    }
  }

  /** Clone do agregado (espelha o banco: leituras não compartilham instância). */
  private snapshot(m: Message): Message {
    return Message.fromState(m.id, {
      ...m.state,
      recipient: { ...m.state.recipient },
      attachments: m.state.attachments.map((a) => ({ ...a })),
    })
  }

  async create(m: Message): Promise<void> {
    // Espelha a unique parcial (consumer_id, idempotency_key) do banco real.
    const { consumerId, idempotencyKey } = m.state
    if (consumerId && idempotencyKey) {
      for (const other of this.store.values()) {
        if (
          other.id !== m.id &&
          other.state.consumerId === consumerId &&
          other.state.idempotencyKey === idempotencyKey
        ) {
          throw new IdempotencyConflictError(
            `Mensagem já enfileirada para (${consumerId}, ${idempotencyKey})`,
          )
        }
      }
    }
    this.store.set(m.id, m)
    this.drain(m)
  }
  async update(m: Message): Promise<void> {
    if (this.failNextUpdateFor.delete(m.id)) {
      throw new ConcurrencyConflictError(m.id)
    }
    this.store.set(m.id, m)
    this.drain(m)
  }
  async findById(id: string): Promise<Message | null> {
    const m = this.store.get(id)
    return m ? this.snapshot(m) : null
  }
  async findByProviderMessageId(providerMessageId: string): Promise<Message | null> {
    for (const m of this.store.values()) {
      if (m.state.providerMessageId === providerMessageId) return this.snapshot(m)
    }
    return null
  }
  async findByIdempotency(consumerId: string, idempotencyKey: string): Promise<Message | null> {
    for (const m of this.store.values()) {
      if (m.state.consumerId === consumerId && m.state.idempotencyKey === idempotencyKey) {
        return this.snapshot(m)
      }
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
          // SENDING com lease (nextAttemptAt) vencido entra como reaper (espelha o Drizzle).
          (m.status === 'QUEUED' || m.status === 'SCHEDULED' || m.status === 'SENDING') &&
          m.state.scheduledAt.getTime() <= now.getTime() &&
          m.state.nextAttemptAt.getTime() <= now.getTime(),
      )
      .sort(
        (a, b) =>
          b.state.priority - a.state.priority ||
          a.state.scheduledAt.getTime() - b.state.scheduledAt.getTime(),
      )
  }

  /**
   * Espelha o `markClaimed` do Drizzle: SENDING + lease; re-claim incrementa
   * attempts. O store guarda um SNAPSHOT e o worker recebe um CLONE — mutações
   * do worker só chegam ao store via `update()` (fidelidade ao banco real).
   */
  private claim(m: Message, now: Date, leaseMs: number): Message {
    const stale = m.status === 'SENDING'
    const props = {
      ...m.state,
      status: 'SENDING' as const,
      nextAttemptAt: new Date(now.getTime() + leaseMs),
      attempts: stale ? m.state.attempts + 1 : m.state.attempts,
    }
    this.store.set(m.id, Message.fromState(m.id, { ...props, recipient: { ...props.recipient } }))
    return Message.fromState(m.id, { ...props, recipient: { ...props.recipient } })
  }

  async claimDueEmail(limit: number, now: Date, leaseMs: number): Promise<Message[]> {
    return this.due('email', now)
      .slice(0, limit)
      .map((m) => this.claim(m, now, leaseMs))
  }

  async claimNextWhatsApp(now: Date, leaseMs: number): Promise<Message | null> {
    const next = this.due('whatsapp', now)[0]
    if (!next) return null
    return this.claim(next, now, leaseMs)
  }

  async cleanup(olderThan: Date): Promise<number> {
    const PENDING = new Set(['QUEUED', 'SCHEDULED', 'SENDING'])
    let removed = 0
    for (const [id, m] of this.store) {
      if (!PENDING.has(m.status) && m.state.createdAt.getTime() < olderThan.getTime()) {
        this.store.delete(id)
        removed += 1
      }
    }
    return removed
  }
}

export class InMemorySenderRepository implements SenderRepository {
  readonly store = new Map<string, EmailSender>()

  private clearOtherDefaults(exceptId: string): void {
    for (const s of this.store.values()) {
      if (s.isDefault && s.id !== exceptId) s.update({ isDefault: false }, new Date())
    }
  }

  async create(s: EmailSender, opts: SaveSenderOptions = {}): Promise<void> {
    if (opts.clearOtherDefaults) this.clearOtherDefaults(s.id)
    this.store.set(s.id, s)
  }
  async update(s: EmailSender, opts: SaveSenderOptions = {}): Promise<void> {
    if (opts.clearOtherDefaults) this.clearOtherDefaults(s.id)
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
    // Normaliza nos dois lados (espelha o repositório Drizzle).
    return `${channel}:${normalizeAddress(channel, address)}`
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

  async alreadyReceived(provider: string, providerEventId: string): Promise<boolean> {
    return this.seen.has(`${provider}:${providerEventId}`)
  }
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
