import type { WhatsAppInstance } from '../../domain/lane/whatsapp-instance.aggregate'
import type { Message } from '../../domain/message/message.aggregate'
import type { Clock } from '../../domain/ports/clock.port'
import type { EmailGateway } from '../../domain/ports/email-gateway.port'
import type { MessageRepository } from '../../domain/ports/message-repository.port'
import { ProviderSendError } from '../../domain/ports/provider-error'
import type { Rng } from '../../domain/ports/rng.port'
import type { SenderRepository } from '../../domain/ports/sender-repository.port'
import type { SuppressionRepository } from '../../domain/ports/suppression-repository.port'
import type { WhatsAppInstanceRepository } from '../../domain/ports/whatsapp-instance-repository.port'
import {
  type BackoffConfig,
  computeNextLaneState,
  computeRetryAt,
  type PacingConfig,
} from '../../domain/services/pacing'
import type { Logger } from '../logging/logger'

export interface SendWorkerConfig {
  intervalMs: number
  /** Máximo de e-mails por tick (≈ taxa/seg × intervalo) — throttle do e-mail. */
  emailBatchSize: number
  /** Máximo de envios de WhatsApp por tick. */
  whatsappBatchSize: number
  /** Reserva (lease) da lane entre o claim e a confirmação do envio (ms). */
  laneLeaseMs: number
  pacing: PacingConfig
  retry: BackoffConfig
  /** Janela do "digitando" (delay) antes de enviar no WhatsApp. */
  typingMinMs: number
  typingMaxMs: number
}

export interface SendWorkerDeps {
  messages: MessageRepository
  instances: WhatsAppInstanceRepository
  senders: SenderRepository
  suppressions: SuppressionRepository
  emailGateway: EmailGateway
  whatsappGateway: WhatsAppGatewayLike
  clock: Clock
  rng: Rng
  logger: Logger
  config: SendWorkerConfig
}

// Evita import cíclico de tipos; apenas a forma usada.
interface WhatsAppGatewayLike {
  sendText(input: {
    instanceName: string
    phoneNumber: string
    text: string
    typingDelayMs?: number
  }): Promise<{ providerMessageId: string | null }>
}

/**
 * Worker de envio: drena e-mails (throttle por lote/tick) e dirige as lanes de
 * WhatsApp (rotação + ritmo anti-ban via `pacing`). Acordado por `LISTEN/NOTIFY`;
 * o poll é a rede de segurança. Seguro com várias réplicas (claims `SKIP LOCKED`
 * + reserva de lane por lease). Relógio e RNG injetados → testável e determinístico.
 */
export class SendWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private wakePending = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: SendWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.wake(), this.deps.config.intervalMs)
    this.deps.logger.info('send.worker.started', { intervalMs: this.deps.config.intervalMs })
  }

  wake(): void {
    if (this.running) {
      this.wakePending = true
      return
    }
    this.inFlight = this.runUntilIdle()
  }

  private async runUntilIdle(): Promise<void> {
    do {
      this.wakePending = false
      await this.tick()
    } while (this.wakePending)
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      await this.processEmail()
      await this.processWhatsApp()
    } catch (error) {
      this.deps.logger.error('send.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  // ── E-mail (throttle por lote/tick) ──────────────────────────────────────────
  private async processEmail(): Promise<void> {
    const batch = await this.deps.messages.claimDueEmail(
      this.deps.config.emailBatchSize,
      this.deps.clock.now(),
    )
    for (const message of batch) {
      await this.sendEmail(message)
    }
  }

  private async sendEmail(message: Message): Promise<void> {
    const now = this.deps.clock.now()
    const email = message.recipient.email
    if (email && (await this.deps.suppressions.isSuppressed('email', email))) {
      message.suppress({ reason: 'suppressed', now })
      await this.deps.messages.update(message)
      return
    }

    const sender = message.state.senderId
      ? await this.deps.senders.findById(message.state.senderId)
      : await this.deps.senders.findDefault()
    if (!sender?.enabled) {
      message.markFailed({ reason: 'Remetente de e-mail indisponível', code: 'NO_SENDER', now })
      await this.deps.messages.update(message)
      return
    }

    try {
      const { providerMessageId } = await this.deps.emailGateway.sendEmail({
        to: email ?? '',
        toName: message.recipient.name,
        subject: message.state.renderedSubject ?? '',
        html: message.state.renderedBody,
        from: sender.state.fromEmail,
        fromName: sender.state.fromName,
        replyTo: sender.state.replyTo,
      })
      message.markSent({ providerMessageId, sentAt: this.deps.clock.now() })
    } catch (error) {
      this.applySendError(message, error)
    }
    await this.deps.messages.update(message)
  }

  // ── WhatsApp (rotação entre lanes + ritmo anti-ban) ──────────────────────────
  private async processWhatsApp(): Promise<void> {
    let sent = 0
    while (sent < this.deps.config.whatsappBatchSize) {
      const now = this.deps.clock.now()
      const lane = await this.deps.instances.reserveAvailableLane(
        now,
        this.deps.config.laneLeaseMs,
        this.deps.config.pacing,
      )
      if (!lane) break // nenhuma lane disponível (delay/descanso/cap/sem número)

      const message = await this.deps.messages.claimNextWhatsApp(this.deps.clock.now())
      if (!message) {
        // Sem trabalho: libera a reserva da lane e encerra.
        await this.deps.instances.delayLane(lane.id, this.deps.clock.now())
        break
      }
      await this.sendWhatsApp(lane, message)
      sent += 1
    }
  }

  private async sendWhatsApp(lane: WhatsAppInstance, message: Message): Promise<void> {
    const now = this.deps.clock.now()
    const phone = message.recipient.phone
    if (phone && (await this.deps.suppressions.isSuppressed('whatsapp', phone))) {
      message.suppress({ reason: 'suppressed', now })
      await this.deps.messages.update(message)
      await this.deps.instances.delayLane(lane.id, this.deps.clock.now())
      return
    }

    try {
      const typingDelayMs = this.deps.rng.intBetween(
        this.deps.config.typingMinMs,
        this.deps.config.typingMaxMs,
      )
      const { providerMessageId } = await this.deps.whatsappGateway.sendText({
        instanceName: lane.instanceName,
        phoneNumber: phone ?? '',
        text: message.state.renderedBody,
        typingDelayMs,
      })
      message.markSent({ providerMessageId, sentAt: this.deps.clock.now(), laneId: lane.id })
      await this.deps.messages.update(message)
      // Avança o ritmo da lane (conta cota + agenda o próximo envio com jitter/descanso).
      const update = computeNextLaneState(
        lane.snapshot(),
        this.deps.config.pacing,
        this.deps.clock.now(),
        this.deps.rng,
      )
      await this.deps.instances.applyLanePacing(lane.id, update)
    } catch (error) {
      this.applySendError(message, error)
      await this.deps.messages.update(message)
      // Falha NÃO conta cota, mas atrasa a lane (não martela um número com problema).
      const delay = this.deps.rng.intBetween(
        this.deps.config.pacing.minDelayMs,
        this.deps.config.pacing.maxDelayMs,
      )
      await this.deps.instances.delayLane(
        lane.id,
        new Date(this.deps.clock.now().getTime() + delay),
      )
    }
  }

  /** Falha permanente → FAILED; transitória → re-enfileira com backoff. */
  private applySendError(message: Message, error: unknown): void {
    const now = this.deps.clock.now()
    const reason = error instanceof Error ? error.message : String(error)
    const code = error instanceof ProviderSendError ? error.code : null
    const permanent = error instanceof ProviderSendError && error.permanent
    if (permanent) {
      message.markFailed({ reason, code, now })
      return
    }
    message.recordSendFailure({
      reason,
      code,
      now,
      nextAttemptAt: computeRetryAt(
        message.state.attempts,
        this.deps.config.retry,
        now,
        this.deps.rng,
      ),
    })
  }
}
