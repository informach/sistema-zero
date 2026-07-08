import type { Logger } from '@sistemazero/core/logging'
import type { AiPipelineResult, TicketAiService } from '../../application/ai/ticket-ai.service'
import type { SettingsRepository } from '../../domain/ports/settings-repository.port'
import type { TicketRepository } from '../../domain/ports/ticket-repository.port'
import { decideAutoReply } from '../../domain/ticket/auto-reply-policy'
import type { Ticket } from '../../domain/ticket/ticket'

const MAX_BACKOFF_MS = 30 * 60_000

export interface AiWorkerConfig {
  intervalMs: number
  /** Lease do claim (crash → o ticket volta a ficar elegível ao vencer). */
  leaseMs: number
  /** Teto de tentativas → `ai_status='failed'` (ticket segue usável sem IA). */
  maxAttempts: number
}

/** Envio da auto-resposta (implementado pelo ReplyService.autoReply). */
export interface AutoReplySender {
  autoReply(ticketId: string, body: string): Promise<{ sent: boolean; reason?: string }>
}

export interface AiWorkerDeps {
  tickets: TicketRepository
  ticketAi: TicketAiService
  /** F4: decide e envia a auto-resposta após o pipeline (settings + sender). */
  autoReply?: { settings: SettingsRepository; sender: AutoReplySender }
  now: () => Date
  logger: Logger
  config: AiWorkerConfig
}

/**
 * Worker da IA: a cada tick CLAIMA um ticket `pending` vencido (SKIP LOCKED →
 * `processing`), roda o pipeline (classificar+resumir+rascunho) e fecha em
 * `done`. Falha transitória (LLM/rede) → backoff exponencial; teto → `failed`
 * (o ticket continua 100% utilizável sem IA). Uma réplica processa por vez.
 */
export class AiWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(private readonly deps: AiWorkerDeps) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick()
    }, this.deps.config.intervalMs)
    this.deps.logger.info('ai.worker.started', { intervalMs: this.deps.config.intervalMs })
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
      const ticket = await this.deps.tickets.claimAiDue(this.deps.config.leaseMs, this.deps.now())
      if (!ticket) return
      try {
        const result = await this.deps.ticketAi.runPipeline(ticket)
        await this.deps.tickets.markAiDone(ticket.id, this.deps.now())
        this.deps.logger.info('ai.processed', { ticketId: ticket.id })
        await this.maybeAutoReply(ticket, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        const at = this.deps.now()
        if (ticket.aiAttempts >= this.deps.config.maxAttempts) {
          await this.deps.tickets.markAiFailed(ticket.id, message, at)
          this.deps.logger.error('ai.failed', { ticketId: ticket.id, error: message })
        } else {
          const backoff = Math.min(
            this.deps.config.intervalMs * 2 ** ticket.aiAttempts,
            MAX_BACKOFF_MS,
          )
          await this.deps.tickets.scheduleAiRetry(
            ticket.id,
            new Date(at.getTime() + backoff),
            message,
            at,
          )
          this.deps.logger.warn('ai.retry_scheduled', {
            ticketId: ticket.id,
            attempts: ticket.aiAttempts,
            error: message,
          })
        }
      }
    } catch (error) {
      this.deps.logger.error('ai.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  /**
   * F4: decide (política PURA) e, se coberto, ENVIA a auto-resposta com guard de
   * fase. Qualquer critério falho vira rascunho + motivo visível na UI. Nunca
   * derruba o processamento da IA (a auto-resposta é best-effort sobre o rascunho).
   */
  private async maybeAutoReply(ticket: Ticket, result: AiPipelineResult): Promise<void> {
    if (!this.deps.autoReply) return
    try {
      const settings = await this.deps.autoReply.settings.get()
      const decision = decideAutoReply({
        settings: {
          autoReplyEnabled: settings.autoReplyEnabled,
          autoReplyCategories: settings.autoReplyCategories,
          autoReplyConfidenceMin: settings.autoReplyConfidenceMin,
        },
        classification: {
          category: result.classification.category,
          confidence: result.classification.confidence,
          sentiment: result.classification.sentiment,
          flags: result.classification.flags,
        },
        kbCoverage: result.draft.kbCoverage,
        ticket: { autoReplyState: ticket.autoReplyState, hasOutbound: result.hasOutbound },
        inbound: {
          isAutoreply: result.lastInbound?.isAutoreply ?? false,
          fromEmail: result.lastInbound?.fromEmail ?? null,
        },
      })
      const at = this.deps.now()
      if (decision.action !== 'send') {
        await this.deps.tickets.setAutoReplyReason(ticket.id, decision.reason, at)
        return
      }
      const sent = await this.deps.autoReply.sender.autoReply(ticket.id, result.draft.reply)
      if (sent.sent) {
        this.deps.logger.info('auto_reply.sent', { ticketId: ticket.id })
      } else {
        await this.deps.tickets.setAutoReplyReason(ticket.id, sent.reason ?? decision.reason, at)
      }
    } catch (error) {
      this.deps.logger.warn('auto_reply.decision_failed', {
        ticketId: ticket.id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
