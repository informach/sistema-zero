import { normalizeAddress } from '../services/address'
import { AggregateRoot } from '../shared/aggregate-root'
import type { Channel } from '../shared/channel'
import { InvalidStateTransitionError, ValidationError } from '../shared/errors'
import {
  MessageDeliveredEvent,
  MessageFailedEvent,
  MessageQueuedEvent,
  MessageSentEvent,
  MessageSuppressedEvent,
} from './message.events'
import type { MessageStatus } from './message.status'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export interface MessageRecipient {
  name: string
  email: string | null
  phone: string | null
}

export interface MessageProps {
  channel: Channel
  templateKey: string
  templateId: string | null
  recipient: MessageRecipient
  variables: Record<string, string>
  renderedSubject: string | null
  renderedBody: string
  senderId: string | null
  laneId: string | null
  priority: number
  status: MessageStatus
  providerMessageId: string | null
  failureReason: string | null
  failureCode: string | null
  scheduledAt: Date
  nextAttemptAt: Date
  attempts: number
  maxAttempts: number
  consumerId: string | null
  idempotencyKey: string | null
  version: number
  createdAt: Date
  sentAt: Date | null
  deliveredAt: Date | null
  readAt: Date | null
  terminalAt: Date | null
}

export interface CreateMessageInput {
  id: string
  channel: Channel
  templateKey: string
  templateId?: string | null
  recipient: { name: string; email?: string | null; phone?: string | null }
  variables?: Record<string, string>
  renderedSubject?: string | null
  renderedBody: string
  senderId?: string | null
  priority?: number
  scheduledAt?: Date
  maxAttempts?: number
  consumerId?: string | null
  idempotencyKey?: string | null
  now: Date
}

/**
 * Mensagem (uma solicitação de envio). Máquina de estados:
 *
 *   QUEUED/SCHEDULED → SENDING → SENT → DELIVERED → READ
 *                                  ↘ FAILED (tentativas esgotadas / 4xx / inválido)
 *   QUEUED/SCHEDULED/SENDING → SUPPRESSED (destinatário em supressão)
 *
 * Transições dirigidas pelo WORKER (claim/send) são estritas; as dirigidas por
 * WEBHOOK de status (delivered/read) são tolerantes (no-op se já passou) — o
 * provedor entrega ≥1 vez e pode chegar fora de ordem.
 */
export class Message extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: MessageProps,
  ) {
    super(id)
  }

  static create(input: CreateMessageInput): Message {
    const name = input.recipient.name?.trim()
    if (!name) throw new ValidationError('Nome do destinatário é obrigatório')

    // Endereços NORMALIZADOS (e-mail minúsculo; telefone só dígitos) — a lista de
    // supressão compara por igualdade, então o formato precisa ser estável.
    const rawEmail = input.recipient.email?.trim() || null
    const rawPhone = input.recipient.phone?.trim() || null
    const email = rawEmail ? normalizeAddress('email', rawEmail) : null
    const phone = rawPhone ? normalizeAddress('whatsapp', rawPhone) : null

    if (input.channel === 'email') {
      if (!email || !EMAIL_RE.test(email)) {
        throw new ValidationError('E-mail do destinatário inválido')
      }
      if (!input.renderedSubject?.trim()) {
        throw new ValidationError('Assunto é obrigatório para e-mail')
      }
    } else if (input.channel === 'whatsapp') {
      if (!phone || !/^\d{10,15}$/.test(phone)) {
        throw new ValidationError('Telefone do destinatário inválido (use 10–15 dígitos)')
      }
    }
    if (!input.renderedBody?.trim()) throw new ValidationError('Corpo da mensagem vazio')

    const scheduledAt = input.scheduledAt ?? input.now
    const status: MessageStatus =
      scheduledAt.getTime() > input.now.getTime() ? 'SCHEDULED' : 'QUEUED'

    const message = new Message(input.id, {
      channel: input.channel,
      templateKey: input.templateKey,
      templateId: input.templateId ?? null,
      recipient: { name, email, phone },
      variables: input.variables ?? {},
      renderedSubject: input.renderedSubject ?? null,
      renderedBody: input.renderedBody,
      senderId: input.senderId ?? null,
      laneId: null,
      priority: input.priority ?? 0,
      status,
      providerMessageId: null,
      failureReason: null,
      failureCode: null,
      scheduledAt,
      nextAttemptAt: scheduledAt,
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 5,
      consumerId: input.consumerId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      version: 0,
      createdAt: input.now,
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      terminalAt: null,
    })
    message.addEvent(
      new MessageQueuedEvent(
        {
          messageId: message.id,
          channel: message.props.channel,
          templateKey: message.props.templateKey,
          scheduledAt: scheduledAt.toISOString(),
        },
        input.now,
      ),
    )
    return message
  }

  /** Rehidrata do banco (confia no estado persistido — sem revalidar). */
  static fromState(id: string, props: MessageProps): Message {
    return new Message(id, props)
  }

  // ── Worker: claim → enviar ─────────────────────────────────────────────────

  /** QUEUED/SCHEDULED → SENDING (o worker reivindicou e vai chamar o provedor). */
  startSending(): void {
    if (this.props.status !== 'QUEUED' && this.props.status !== 'SCHEDULED') {
      throw new InvalidStateTransitionError(
        `Não é possível enviar a mensagem em ${this.props.status}`,
      )
    }
    this.props.status = 'SENDING'
  }

  assignLane(laneId: string): void {
    this.props.laneId = laneId
  }

  /** SENDING → SENT (aceita pelo provedor). */
  markSent(input: {
    providerMessageId: string | null
    sentAt: Date
    laneId?: string | null
  }): void {
    if (this.props.status !== 'SENDING') {
      throw new InvalidStateTransitionError(`markSent inválido em ${this.props.status}`)
    }
    this.props.status = 'SENT'
    this.props.providerMessageId = input.providerMessageId
    this.props.sentAt = input.sentAt
    if (input.laneId !== undefined) this.props.laneId = input.laneId
    this.addEvent(
      new MessageSentEvent(
        {
          messageId: this.id,
          channel: this.props.channel,
          templateKey: this.props.templateKey,
          providerMessageId: input.providerMessageId,
          sentAt: input.sentAt.toISOString(),
        },
        input.sentAt,
      ),
    )
  }

  /**
   * Registra uma falha transitória de envio. Incrementa as tentativas; se atingiu
   * o teto, vira FAILED (terminal, com evento); senão volta a QUEUED com a próxima
   * tentativa agendada. Retorna `true` se ficou terminal.
   */
  recordSendFailure(input: {
    reason: string
    code?: string | null
    now: Date
    nextAttemptAt: Date
  }): boolean {
    if (this.props.status !== 'SENDING') {
      throw new InvalidStateTransitionError(`recordSendFailure inválido em ${this.props.status}`)
    }
    this.props.attempts += 1
    this.props.failureReason = input.reason
    this.props.failureCode = input.code ?? null
    if (this.props.attempts >= this.props.maxAttempts) {
      this.toFailed(input.reason, input.code ?? null, input.now)
      return true
    }
    this.props.status = 'QUEUED'
    this.props.nextAttemptAt = input.nextAttemptAt
    return false
  }

  /** Falha DEFINITIVA (ex.: 4xx do provedor / destinatário inválido). */
  markFailed(input: { reason: string; code?: string | null; now: Date }): void {
    if (this.props.status === 'FAILED') return
    this.props.attempts += 1
    this.toFailed(input.reason, input.code ?? null, input.now)
  }

  private toFailed(reason: string, code: string | null, now: Date): void {
    this.props.status = 'FAILED'
    this.props.failureReason = reason
    this.props.failureCode = code
    this.props.terminalAt = now
    this.addEvent(
      new MessageFailedEvent(
        {
          messageId: this.id,
          channel: this.props.channel,
          templateKey: this.props.templateKey,
          reason,
          code,
        },
        now,
      ),
    )
  }

  /** Destinatário em supressão → não envia. */
  suppress(input: { reason: string; now: Date }): void {
    if (this.props.status === 'SUPPRESSED') return
    this.props.status = 'SUPPRESSED'
    this.props.failureReason = input.reason
    this.props.terminalAt = input.now
    this.addEvent(
      new MessageSuppressedEvent(
        {
          messageId: this.id,
          channel: this.props.channel,
          templateKey: this.props.templateKey,
          reason: input.reason,
        },
        input.now,
      ),
    )
  }

  // ── Webhooks de status (tolerantes/idempotentes) ────────────────────────────

  /** SENT/SENDING → DELIVERED. No-op (retorna false) se já entregue/lida/terminal. */
  markDelivered(deliveredAt: Date): boolean {
    if (this.props.status !== 'SENT' && this.props.status !== 'SENDING') return false
    this.props.status = 'DELIVERED'
    this.props.deliveredAt = deliveredAt
    this.addEvent(
      new MessageDeliveredEvent(
        {
          messageId: this.id,
          channel: this.props.channel,
          templateKey: this.props.templateKey,
          deliveredAt: deliveredAt.toISOString(),
        },
        deliveredAt,
      ),
    )
    return true
  }

  /** DELIVERED/SENT → READ (só WhatsApp). No-op (false) se já lida/terminal. */
  markRead(readAt: Date): boolean {
    if (this.props.status !== 'DELIVERED' && this.props.status !== 'SENT') return false
    this.props.status = 'READ'
    this.props.readAt = readAt
    if (!this.props.deliveredAt) this.props.deliveredAt = readAt
    return true
  }

  // ── Getters ─────────────────────────────────────────────────────────────────
  get channel(): Channel {
    return this.props.channel
  }
  get status(): MessageStatus {
    return this.props.status
  }
  get recipient(): MessageRecipient {
    return this.props.recipient
  }
  get version(): number {
    return this.props.version
  }
  get state(): Readonly<MessageProps> {
    return this.props
  }
}
