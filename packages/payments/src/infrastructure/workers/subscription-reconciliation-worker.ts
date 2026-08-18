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
    this.logger.info('subscription.reconcile.worker.started', {
      intervalMs: this.options.intervalMs,
    })
    // ⚠️⚠️ Uma volta no BOOT, antes do intervalo. Sem ela a rede não existe na
    // prática: o intervalo é de 6h e CADA deploy zera o relógio, então num dia de
    // deploys frequentes a varredura nunca chega a rodar (medido em produção —
    // `last_reconciled_at` ficou NUNCA nas duas assinaturas com o serviço horas no
    // ar). Mesmo caso, e mesmo idioma, da purga de tokens do auth.
    //
    // ⚠️ IMEDIATO, nunca `setTimeout`: o `stop()` só conhece `clearInterval` + o
    // `inFlight`, então um timer pendente seria invisível aos dois e dispararia
    // depois do pool fechar. O `tick()` publica o `inFlight` de forma síncrona, e
    // é isso que faz o shutdown drenar esta primeira volta.
    void this.tick()
    this.timer = setInterval(() => {
      void this.tick()
    }, this.options.intervalMs)
  }

  /** Para o agendamento e drena o ciclo em andamento (shutdown gracioso). */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    if (this.inFlight) await this.inFlight
  }

  tick(): Promise<void> {
    if (this.inFlight) return this.inFlight
    const work = this.runTick()
    this.inFlight = work
    void work.finally(() => {
      if (this.inFlight === work) this.inFlight = null
    })
    return work
  }

  private async runTick(): Promise<void> {
    try {
      const active = await this.subscriptions.claimActiveForReconcile(this.options.batchSize)
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

        // ⚠️ O `handleCycle` pode RECUSAR sem lançar (divergência de valor, evento
        // já consumido no inbox). Sem conferir se a linha nasceu, a varredura
        // gritaria "recuperei" a cada volta, para sempre, no caso que mais pede
        // olho humano. O alerta abaixo exige a PROVA.
        const registrado = await this.payments.findByProviderPaymentId(
          this.gateway.provider,
          charge.chargeId,
        )
        if (!registrado) {
          // Quieto de propósito: quem sabe o motivo é o `handleCycle`, e ele já
          // falou (em ERROR) na primeira vez — repetir aqui vira ruído de 6 em 6h.
          this.logger.info('subscription.reconcile.cycle_not_ingested', {
            subscriptionId: subscription.id,
            chargeId: charge.chargeId,
          })
          continue
        }

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
