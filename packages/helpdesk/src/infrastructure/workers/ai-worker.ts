import type { Logger } from '@sistemazero/core/logging'
import type { TicketAiService } from '../../application/ai/ticket-ai.service'
import type { TicketRepository } from '../../domain/ports/ticket-repository.port'

const MAX_BACKOFF_MS = 30 * 60_000

export interface AiWorkerConfig {
  intervalMs: number
  /** Lease do claim (crash → o ticket volta a ficar elegível ao vencer). */
  leaseMs: number
  /** Teto de tentativas → `ai_status='failed'` (ticket segue usável sem IA). */
  maxAttempts: number
}

export interface AiWorkerDeps {
  tickets: TicketRepository
  ticketAi: TicketAiService
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
        await this.deps.ticketAi.runPipeline(ticket)
        await this.deps.tickets.markAiDone(ticket.id, this.deps.now())
        this.deps.logger.info('ai.processed', { ticketId: ticket.id })
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
}
