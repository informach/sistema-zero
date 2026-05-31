import type { ConsumerRepository } from '../../domain/ports/consumer-repository.port'
import type {
  WebhookDelivery,
  WebhookDeliveryRepository,
} from '../../domain/ports/webhook-delivery.port'
import type { Logger } from '../logging/logger'
import { signHmac } from '../security/hmac'

export interface WebhookDeliveryWorkerOptions {
  intervalMs: number
  batchSize: number
  maxAttempts: number
  leaseMs?: number
  timeoutMs?: number
  /** Entregas em paralelo por ciclo — encurta o lote p/ caber dentro do lease. */
  concurrency?: number
}

/**
 * Entrega os webhooks de saída aos consumidores. Assina o corpo com HMAC (mesmo
 * esquema das requisições de entrada) e faz retry com backoff exponencial;
 * após `maxAttempts`, marca como DEAD. Entrega at-least-once → o consumidor deve
 * deduplicar (pelo `data.paymentId` ou pelo header `X-Delivery-Id`).
 */
export class WebhookDeliveryWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private wakePending = false
  private inFlight: Promise<void> | null = null

  constructor(
    private readonly deliveries: WebhookDeliveryRepository,
    private readonly consumers: ConsumerRepository,
    private readonly logger: Logger,
    private readonly options: WebhookDeliveryWorkerOptions,
  ) {}

  start(): void {
    if (this.timer) return
    // O intervalo é a REDE DE SEGURANÇA; o LISTEN/NOTIFY (via wake) é o caminho rápido.
    this.timer = setInterval(() => this.wake(), this.options.intervalMs)
    this.logger.info('webhook.worker.started', { intervalMs: this.options.intervalMs })
  }

  /**
   * Acorda o worker imediatamente (NOTIFY do Postgres ou intervalo). Notificações
   * recebidas durante um ciclo em andamento são reprocessadas ao final.
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

  async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const due = await this.deliveries.claimDue(
        this.options.batchSize,
        this.options.leaseMs ?? 30_000,
      )
      // Processa em paralelo (limitado) p/ o lote terminar dentro do lease e não
      // ter entregas re-reivindicadas por outra réplica (entrega duplicada).
      const concurrency = Math.max(1, this.options.concurrency ?? 5)
      for (let i = 0; i < due.length; i += concurrency) {
        await Promise.all(due.slice(i, i + concurrency).map((delivery) => this.deliver(delivery)))
      }
    } catch (error) {
      this.logger.error('webhook.worker.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  private async deliver(delivery: WebhookDelivery): Promise<void> {
    const consumer = await this.consumers.findById(delivery.consumerId)
    if (!consumer?.webhookUrl) {
      await this.deliveries.markDead(delivery.id, 'consumidor sem webhook_url')
      return
    }

    const body = JSON.stringify({
      id: delivery.id,
      event: delivery.eventName,
      data: delivery.payload,
    })
    const ts = Math.floor(Date.now() / 1000)
    const signature = `t=${ts},v1=${signHmac(consumer.hmacSecret, body, ts)}`

    let statusCode: number | undefined
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 10_000)
      let res: Response
      try {
        res = await fetch(consumer.webhookUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-signature': signature,
            'x-event-type': delivery.eventName,
            'x-delivery-id': delivery.id,
          },
          body,
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }
      statusCode = res.status
      if (res.ok) {
        await this.deliveries.markSucceeded(delivery.id, res.status)
        this.logger.info('webhook.delivered', {
          id: delivery.id,
          consumerId: delivery.consumerId,
          status: res.status,
        })
        return
      }
      throw new Error(`HTTP ${res.status}`)
    } catch (error) {
      const attempts = delivery.attempts + 1
      const message = error instanceof Error ? error.message : String(error)
      if (attempts >= this.options.maxAttempts) {
        await this.deliveries.markDead(delivery.id, message)
        this.logger.warn('webhook.dead', { id: delivery.id, attempts })
        return
      }
      const delaySeconds = Math.min(30 * 2 ** (attempts - 1), 3600)
      await this.deliveries.reschedule(
        delivery.id,
        attempts,
        new Date(Date.now() + delaySeconds * 1000),
        message,
        statusCode,
      )
      this.logger.info('webhook.retry_scheduled', { id: delivery.id, attempts, delaySeconds })
    }
  }
}
