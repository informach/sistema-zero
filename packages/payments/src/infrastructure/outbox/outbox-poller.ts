import type { EventPublisher, OutboxRepository } from '../../domain/ports/outbox.port'
import type { Logger } from '../logging/logger'

export interface OutboxPollerOptions {
  intervalMs: number
  batchSize: number
  /** Após N falhas de publicação, a mensagem vira DEAD (dead-letter). */
  maxAttempts: number
}

/**
 * Publica eventos pendentes do outbox em intervalos regulares. Seguro para
 * múltiplas réplicas (o repositório usa `FOR UPDATE SKIP LOCKED`). Garante
 * entrega ao menos uma vez — consumidores devem ser idempotentes.
 */
export class OutboxPoller {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private wakePending = false
  private inFlight: Promise<void> | null = null

  constructor(
    private readonly outbox: OutboxRepository,
    private readonly publisher: EventPublisher,
    private readonly logger: Logger,
    private readonly options: OutboxPollerOptions,
  ) {}

  start(): void {
    if (this.timer) return
    // O intervalo é a REDE DE SEGURANÇA; o LISTEN/NOTIFY (via wake) é o caminho rápido.
    this.timer = setInterval(() => this.wake(), this.options.intervalMs)
    this.logger.info('outbox.poller.started', { intervalMs: this.options.intervalMs })
  }

  /**
   * Acorda o poller imediatamente (chamado por NOTIFY do Postgres ou pelo
   * intervalo). Se já há um ciclo rodando, marca para reprocessar ao final —
   * assim nenhuma notificação recebida durante o tick é perdida.
   */
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

  /** Para o agendamento e drena o ciclo em andamento (shutdown gracioso). */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  /** Processa um lote. Reentrância protegida para não sobrepor execuções na mesma instância. */
  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const { published, failed, dead } = await this.outbox.processPending(
        this.options.batchSize,
        this.options.maxAttempts,
        (message) => this.publisher.publish(message),
      )
      if (published > 0 || failed > 0 || dead > 0) {
        this.logger.info('outbox.flush', { published, failed, dead })
      }
      if (dead > 0) this.logger.error('outbox.dead_letter', { dead })
    } catch (error) {
      this.logger.error('outbox.tick.failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }
}
