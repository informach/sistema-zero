import type { HandleSubscriptionNotificationService } from '../../application/handle-subscription-notification/handle-subscription-notification.service'
import type { PaymentGateway } from '../../domain/ports/payment-gateway.port'
import type { PaymentRepository } from '../../domain/ports/payment-repository.port'
import type { SubscriptionRepository } from '../../domain/ports/subscription-repository.port'
import type { SubscriptionAggregate } from '../../domain/subscription/subscription.aggregate'
import type { Logger } from '../logging/logger'

export interface SubscriptionReconciliationWorkerOptions {
  intervalMs: number
  batchSize: number
  /** Quantas assinaturas consultar em paralelo na Efí. Padrão 3. */
  concurrency?: number
}

/**
 * Rede de segurança das RENOVAÇÕES: varre as assinaturas ativas, pede o histórico
 * de ciclos ao provedor e registra a cobrança PAGA que nunca virou linha aqui.
 *
 * ⚠️⚠️ Por que ela existe: em 08/2026 um assinante **pagou a renovação e perdeu o
 * acesso**. As assinaturas tinham sido criadas na Efí com `notification_url` nulo,
 * então a notificação do ciclo nunca chegou — e o `ReconciliationWorker` irmão não
 * enxerga esse caso, porque ele varre pagamentos `PENDING` e aqui **não existia
 * linha nenhuma** para ficar pendente. Só o provedor sabia que houve pagamento.
 *
 * ⭐ Ela só DESCOBRE; quem age é o `handleCycle`, o mesmo caminho da notificação
 * (re-consulta a cobrança, deduplica no inbox, cria o ciclo, marca pago, sincroniza
 * a assinatura e emite `payment.paid`). Por isso é idempotente e segura em várias
 * réplicas.
 *
 * ⚠️ **Sem advisory lock, de propósito.** O idioma de lock do pacote é
 * `pg_try_advisory_xact_lock`, que só vale enquanto a transação vive — e aqui a
 * volta faz chamadas EXTERNAS (uma à Efí por assinatura), então a transação
 * ficaria `idle in transaction` e o timeout de 30s a mataria no meio (é o risco
 * que o próprio ciclo de retenção documenta). Como o trabalho é idempotente nas
 * duas camadas (o `findByProviderPaymentId` aqui e o inbox lá dentro), duas
 * réplicas varrendo juntas não duplicam nada — só gastam uma consulta a mais.
 */
export class SubscriptionReconciliationWorker {
  private timer: ReturnType<typeof setInterval> | null = null
  private running = false
  private inFlight: Promise<void> | null = null

  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly cycles: HandleSubscriptionNotificationService,
    private readonly logger: Logger,
    private readonly options: SubscriptionReconciliationWorkerOptions,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      this.inFlight = this.tick().finally(() => {
        this.inFlight = null
      })
    }, this.options.intervalMs)
    this.logger.info('subscription.reconcile.worker.started', {
      intervalMs: this.options.intervalMs,
    })
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
      const active = await this.subscriptions.findActiveForReconcile(this.options.batchSize)
      const concurrency = Math.max(1, this.options.concurrency ?? 3)
      for (let i = 0; i < active.length; i += concurrency) {
        // O handler por item NUNCA lança (ver `sweep`), senão uma assinatura
        // ruim abortaria as irmãs do mesmo `Promise.all`.
        await Promise.all(active.slice(i, i + concurrency).map((sub) => this.sweep(sub)))
      }
    } catch (error) {
      this.logger.error('subscription.reconcile.tick_failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      this.running = false
    }
  }

  /** Uma assinatura: acha os ciclos pagos sem linha e manda o `handleCycle` registrar. */
  private async sweep(subscription: SubscriptionAggregate): Promise<void> {
    const providerId = subscription.providerSubscriptionId
    if (!providerId) return
    try {
      const charges = await this.gateway.listSubscriptionCharges(providerId)
      for (const charge of charges) {
        if (charge.status !== 'PAID') continue
        const known = await this.payments.findByProviderPaymentId(
          this.gateway.provider,
          charge.chargeId,
        )
        if (known) continue

        await this.cycles.handleCycle({ subscriptionId: providerId, chargeId: charge.chargeId })

        // ⚠️ ERROR de PROPÓSITO, não engano: a convenção do pacote é "log ERROR =
        // sinal alertável" (o espelho do Sentry transforma em issue). Recuperar um
        // ciclo aqui significa que a notificação do provedor se perdeu — dinheiro
        // que entrou sem a gente saber. O sucesso da recuperação não apaga o furo.
        this.logger.error('subscription.reconcile.cycle_recovered', {
          subscriptionId: subscription.id,
          providerSubscriptionId: providerId,
          chargeId: charge.chargeId,
        })
      }
    } catch (error) {
      this.logger.error('subscription.reconcile.item_failed', {
        subscriptionId: subscription.id,
        providerSubscriptionId: providerId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
