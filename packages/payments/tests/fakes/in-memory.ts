import { PaymentAggregate } from '../../src/domain/payment/payment.aggregate'
import type { Consumer, ConsumerRepository } from '../../src/domain/ports/consumer-repository.port'
import type {
  IdempotencyRecord,
  IdempotencyStore,
  ReserveResult,
} from '../../src/domain/ports/idempotency-store.port'
import type { OutboxMessage } from '../../src/domain/ports/outbox.port'
import type {
  CreateBoletoChargeInput,
  CreateBoletoChargeOutput,
  CreateCardChargeInput,
  CreateCardChargeOutput,
  CreateCardSubscriptionInput,
  CreateCardSubscriptionOutput,
  CreatePixChargeInput,
  CreatePixChargeOutput,
  CreatePlanInput,
  CreatePlanOutput,
  PaymentGateway,
  ProviderCharge,
  ProviderChargeStatus,
  ProviderNotification,
  ProviderNotificationEntry,
  ProviderSubscription,
  ProviderSubscriptionCharge,
  ProviderSubscriptionStatus,
  RefundPixInput,
  RefundResult,
} from '../../src/domain/ports/payment-gateway.port'
import type {
  ClaimedCharge,
  PaymentRepository,
} from '../../src/domain/ports/payment-repository.port'
import type { SubscriptionPlanRegistry } from '../../src/domain/ports/subscription-plan-registry.port'
import type { SubscriptionRepository } from '../../src/domain/ports/subscription-repository.port'
import type {
  WebhookDelivery,
  WebhookDeliveryRepository,
} from '../../src/domain/ports/webhook-delivery.port'
import type { WebhookInbox } from '../../src/domain/ports/webhook-inbox.port'
import { SubscriptionAggregate } from '../../src/domain/subscription/subscription.aggregate'
import type { Money } from '../../src/domain/value-objects/money'
import type { Logger } from '../../src/infrastructure/logging/logger'
import { ConcurrencyConflictError } from '../../src/infrastructure/persistence/drizzle/concurrency.error'

/** Logger silencioso para os testes. */
export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

/**
 * Repositório em memória. Salva um snapshot reidratado (imitando ida ao banco) e
 * captura os eventos drenados (como se fossem gravados no outbox).
 */
export class InMemoryPaymentRepository implements PaymentRepository {
  readonly byId = new Map<string, PaymentAggregate>()
  readonly outbox: OutboxMessage[] = []
  private readonly chargeAttempts = new Map<string, number>()

  async save(payment: PaymentAggregate): Promise<void> {
    // Concorrência otimista: o writer com versão defasada perde (igual ao real).
    const existing = this.byId.get(payment.id)
    if (existing && existing.version !== payment.version) {
      throw new ConcurrencyConflictError(payment.id)
    }

    for (const event of payment.pullEvents()) {
      this.outbox.push({
        id: crypto.randomUUID(),
        aggregateId: event.aggregateId,
        eventName: event.eventName,
        payload: event.toPayload(),
        attemptCount: 0,
        createdAt: new Date(),
      })
    }

    const snap = payment.toSnapshot()
    if (existing) snap.version = payment.version + 1 // bump na gravação (UPDATE)
    this.byId.set(payment.id, PaymentAggregate.restore(snap))
  }

  async findById(id: string): Promise<PaymentAggregate | null> {
    const found = this.byId.get(id)
    return found ? PaymentAggregate.restore(found.toSnapshot()) : null
  }

  async findByIdempotencyKey(
    consumerId: string,
    idempotencyKey: string,
  ): Promise<PaymentAggregate | null> {
    for (const p of this.byId.values()) {
      if (p.consumerId === consumerId && p.idempotencyKey === idempotencyKey) {
        return PaymentAggregate.restore(p.toSnapshot())
      }
    }
    return null
  }

  async findByTxid(txid: string): Promise<PaymentAggregate | null> {
    for (const p of this.byId.values()) {
      if (p.txid === txid) return PaymentAggregate.restore(p.toSnapshot())
    }
    return null
  }

  async findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentAggregate | null> {
    for (const p of this.byId.values()) {
      if (p.provider === provider && p.providerPaymentId === providerPaymentId) {
        return PaymentAggregate.restore(p.toSnapshot())
      }
    }
    return null
  }

  private readonly chargeClaimedAt = new Map<string, number>()

  async claimPendingCharges(limit: number, staleAfterMs: number): Promise<ClaimedCharge[]> {
    const now = Date.now()
    const result: ClaimedCharge[] = []
    for (const p of this.byId.values()) {
      if (result.length >= limit) break
      if (
        (p.method.type === 'PIX' || p.method.type === 'BOLETO') &&
        p.status === 'PENDING' &&
        p.providerPaymentId === null
      ) {
        // Lease: um claim recente não é re-reivindicado até passar staleAfterMs
        // (modela o `chargeClaimedAt` + SKIP LOCKED do adapter real).
        const claimedAt = this.chargeClaimedAt.get(p.id)
        const stale = claimedAt === undefined || claimedAt <= now - staleAfterMs
        if (!stale) continue
        this.chargeClaimedAt.set(p.id, now)
        const attempts = (this.chargeAttempts.get(p.id) ?? 0) + 1
        this.chargeAttempts.set(p.id, attempts)
        result.push({ payment: PaymentAggregate.restore(p.toSnapshot()), attempts })
      }
    }
    return result
  }

  async findStalePendingCharges(limit: number, _olderThanMs: number): Promise<PaymentAggregate[]> {
    const result: PaymentAggregate[] = []
    for (const p of this.byId.values()) {
      if (result.length >= limit) break
      if (
        (p.method.type === 'PIX' ||
          p.method.type === 'BOLETO' ||
          p.method.type === 'CREDIT_CARD') &&
        p.status === 'PENDING' &&
        p.providerPaymentId !== null
      ) {
        result.push(PaymentAggregate.restore(p.toSnapshot()))
      }
    }
    return result
  }
}

export class InMemoryWebhookDeliveryRepository implements WebhookDeliveryRepository {
  readonly enqueued: {
    consumerId: string
    eventName: string
    dedupKey: string
    payload: Record<string, unknown>
  }[] = []

  async enqueue(input: {
    consumerId: string
    eventName: string
    dedupKey: string
    payload: Record<string, unknown>
  }): Promise<void> {
    // Idempotente por (consumerId, eventName, dedupKey), como o adapter real.
    const dup = this.enqueued.some(
      (e) =>
        e.consumerId === input.consumerId &&
        e.eventName === input.eventName &&
        e.dedupKey === input.dedupKey,
    )
    if (!dup) this.enqueued.push(input)
  }

  /**
   * ⚠️ NO-OP de propósito: este fake só serve para testar o ENFILEIRAMENTO
   * (`enqueue` idempotente). Ele NÃO modela o lado do worker — o real incrementa
   * `attempts` ATOMICAMENTE no claim e aplica lease/backoff. Para testar o
   * `WebhookDeliveryWorker`, use um stub próprio com fixtures de `attempts` já
   * incrementado (ver `webhook-delivery.test.ts`), não este fake.
   */
  async claimDue(): Promise<WebhookDelivery[]> {
    return []
  }
  async markSucceeded(): Promise<void> {}
  async reschedule(): Promise<void> {}
  async markDead(): Promise<void> {}
}

/**
 * Fake fiel ao adapter real: chave escopada por `(consumerId, key)`, modela o
 * lease de reservas `IN_FLIGHT` (expira → reciclável) e o TTL de conclusão.
 */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<
    string,
    IdempotencyRecord & { expiresAt: number; reservationId: string }
  >()

  /** Permite ao teste avançar o relógio lógico (ms) sem usar timers reais. */
  clockSkewMs = 0

  private now(): number {
    return Date.now() + this.clockSkewMs
  }

  private compositeKey(consumerId: string, key: string): string {
    return `${consumerId}\u0000${key}`
  }

  async reserve(input: {
    consumerId: string
    key: string
    requestHash: string
    inFlightTtlSeconds: number
  }): Promise<ReserveResult> {
    const ck = this.compositeKey(input.consumerId, input.key)
    const existing = this.map.get(ck)

    // Reserva presa e expirada → recicla (toma o lugar).
    if (existing && existing.state === 'IN_FLIGHT' && existing.expiresAt <= this.now()) {
      this.map.delete(ck)
    } else if (existing) {
      const { expiresAt: _e, reservationId: _r, ...record } = existing
      return { kind: 'existing', record: { ...record } }
    }

    const reservationId = crypto.randomUUID()
    this.map.set(ck, {
      consumerId: input.consumerId,
      key: input.key,
      requestHash: input.requestHash,
      reservationId,
      state: 'IN_FLIGHT',
      responseStatus: null,
      responseBody: null,
      expiresAt: this.now() + input.inFlightTtlSeconds * 1000,
    })
    return { kind: 'acquired', reservationId }
  }

  async complete(input: {
    consumerId: string
    key: string
    reservationId: string
    responseStatus: number
    responseBody: unknown
    ttlSeconds: number
  }): Promise<void> {
    const record = this.map.get(this.compositeKey(input.consumerId, input.key))
    // Fencing: só conclui a própria reserva IN_FLIGHT (um complete zumbi é no-op).
    if (record && record.state === 'IN_FLIGHT' && record.reservationId === input.reservationId) {
      record.state = 'COMPLETED'
      record.responseStatus = input.responseStatus
      record.responseBody = input.responseBody
      record.expiresAt = this.now() + input.ttlSeconds * 1000
    }
  }

  async release(consumerId: string, key: string, reservationId: string): Promise<void> {
    const ck = this.compositeKey(consumerId, key)
    const record = this.map.get(ck)
    // Fencing: só remove a própria reserva IN_FLIGHT — nunca COMPLETED nem de outro dono.
    if (record && record.state === 'IN_FLIGHT' && record.reservationId === reservationId) {
      this.map.delete(ck)
    }
  }

  async cleanupExpired(): Promise<void> {
    for (const [ck, record] of this.map) {
      if (record.expiresAt <= this.now()) this.map.delete(ck)
    }
  }
}

export class FakePixGateway implements PaymentGateway {
  readonly provider = 'EFI'
  chargeStatus: ProviderChargeStatus = 'PAID'
  createdCount = 0
  /** Total de chamadas a createPixCharge (inclui as que falharam). */
  createCalls = 0
  /** Último input recebido por createPixCharge (p/ asserts de customer/devedor). */
  lastPixInput: CreatePixChargeInput | null = null
  failCreate = false
  /** Se definido, getPixCharge devolve este valor (para testar amount_mismatch). */
  overrideAmountInCents: bigint | null = null
  /** txids para os quais getPixCharge lança (testa isolamento por item). */
  readonly failGetChargeTxids = new Set<string>()
  /** Valor cobrado por txid (para o getPixCharge devolver o valor real criado). */
  private readonly amountByTxid = new Map<string, bigint>()

  // ── Boleto ──
  boletoCreatedCount = 0
  boletoStatus: ProviderChargeStatus = 'PAID'
  failBoletoCreate = false
  /** charge_ids retornados por getNotification (default: o próprio token). */
  notificationChargeIds: string[] = []
  /** charge_ids para os quais getBoletoCharge lança (testa isolamento por item). */
  readonly failGetBoletoChargeIds = new Set<string>()
  private readonly amountByChargeId = new Map<string, bigint>()

  // ── Cartão ──
  cardCreatedCount = 0
  cardStatus: ProviderChargeStatus = 'PAID'
  cardFailureReason?: string
  failCardCreate = false
  /** charge_ids para os quais getCardCharge lança (testa isolamento por item). */
  readonly failGetCardChargeIds = new Set<string>()
  private readonly amountByCardChargeId = new Map<string, bigint>()

  // ── Assinatura ──
  planCreatedCount = 0
  subscriptionCreatedCount = 0
  failSubscriptionCreate = false
  subscriptionStatus: ProviderSubscriptionStatus = 'ACTIVE'
  /** Status da 1ª cobrança na resposta de criação (undefined = sem 1ª cobrança). */
  firstChargeStatus: ProviderChargeStatus | undefined = 'PAID'
  /** charge_id da 1ª cobrança (default derivado do subscriptionId). */
  firstChargeId: string | null = null
  readonly canceledSubscriptionIds: string[] = []
  /** Entradas retornadas por getNotification (sobrepõe notificationChargeIds). */
  notificationEntries: ProviderNotificationEntry[] | null = null

  async createPixCharge(input: CreatePixChargeInput): Promise<CreatePixChargeOutput> {
    this.createCalls++
    this.lastPixInput = input
    if (this.failCreate) throw new Error('falha simulada na criação da cobrança')
    this.createdCount++
    // txid determinístico por pagamento (como o adapter real via PUT /v2/cob/{txid}).
    const txid = `txid-${input.paymentId.slice(0, 8)}`
    this.amountByTxid.set(txid, input.amount.amountInCents)
    return {
      providerPaymentId: txid,
      txid,
      copiaECola: '00020126BR.GOV.BCB.PIX-FAKE-COPIA-E-COLA',
      imagemQrcodeBase64: 'data:image/png;base64,QQ==',
      locationId: '1',
      expiresAt: new Date(Date.now() + 3_600_000),
    }
  }

  async getPixCharge(txid: string): Promise<ProviderCharge> {
    if (this.failGetChargeTxids.has(txid)) throw new Error('falha simulada no getPixCharge')
    return {
      providerPaymentId: txid,
      txid,
      status: this.chargeStatus,
      amountInCents: this.overrideAmountInCents ?? this.amountByTxid.get(txid) ?? 1000n,
      paidAt: this.chargeStatus === 'PAID' ? new Date() : undefined,
    }
  }

  async createBoletoCharge(input: CreateBoletoChargeInput): Promise<CreateBoletoChargeOutput> {
    if (this.failBoletoCreate) throw new Error('falha simulada na criação do boleto')
    this.boletoCreatedCount++
    const chargeId = `boleto-${input.paymentId.slice(0, 8)}`
    this.amountByChargeId.set(chargeId, input.amount.amountInCents)
    return {
      providerPaymentId: chargeId,
      barcode: '34191790010104351004791020150008291070026000',
      digitableLine: '34191.79001 01043.510047 91020.150008 2 91070026000',
      pdfUrl: `https://efi.fake/boleto/${chargeId}.pdf`,
      expiresAt: new Date(`${input.expireAt}T00:00:00Z`),
    }
  }

  async getBoletoCharge(providerId: string): Promise<ProviderCharge> {
    if (this.failGetBoletoChargeIds.has(providerId)) {
      throw new Error('falha simulada no getBoletoCharge')
    }
    return {
      providerPaymentId: providerId,
      status: this.boletoStatus,
      amountInCents: this.overrideAmountInCents ?? this.amountByChargeId.get(providerId) ?? 1000n,
      paidAt: this.boletoStatus === 'PAID' ? new Date() : undefined,
    }
  }

  async getNotification(token: string): Promise<ProviderNotification> {
    if (this.notificationEntries) {
      return {
        chargeIds: this.notificationEntries.filter((e) => !e.subscriptionId).map((e) => e.chargeId),
        entries: this.notificationEntries,
      }
    }
    const chargeIds = this.notificationChargeIds.length ? this.notificationChargeIds : [token]
    return { chargeIds, entries: chargeIds.map((chargeId) => ({ chargeId })) }
  }

  async createCardCharge(input: CreateCardChargeInput): Promise<CreateCardChargeOutput> {
    if (this.failCardCreate) throw new Error('falha simulada na criação do cartão')
    this.cardCreatedCount++
    const chargeId = `card-${input.paymentId.slice(0, 8)}`
    this.amountByCardChargeId.set(chargeId, input.amount.amountInCents)
    return {
      providerPaymentId: chargeId,
      status: this.cardStatus,
      installments: input.installments,
      totalInCents: input.amount.amountInCents,
    }
  }

  async getCardCharge(providerId: string): Promise<ProviderCharge> {
    if (this.failGetCardChargeIds.has(providerId)) {
      throw new Error('falha simulada no getCardCharge')
    }
    return {
      providerPaymentId: providerId,
      status: this.cardStatus,
      amountInCents:
        this.overrideAmountInCents ?? this.amountByCardChargeId.get(providerId) ?? 1000n,
      paidAt: this.cardStatus === 'PAID' ? new Date() : undefined,
      failureReason: this.cardFailureReason,
    }
  }

  async createPlan(input: CreatePlanInput): Promise<CreatePlanOutput> {
    this.planCreatedCount++
    // plan_id determinístico por (intervalo, repetições) → o registro reusa entre assinaturas.
    return { planId: `plan-${input.intervalMonths}-${input.repeats ?? 'inf'}` }
  }

  async createCardSubscription(
    input: CreateCardSubscriptionInput,
  ): Promise<CreateCardSubscriptionOutput> {
    if (this.failSubscriptionCreate) throw new Error('falha simulada na criação da assinatura')
    this.subscriptionCreatedCount++
    const firstChargeId = this.firstChargeStatus
      ? (this.firstChargeId ?? `subcharge-${input.subscriptionId.slice(0, 8)}`)
      : undefined
    // getCardCharge desta cobrança devolve o valor da assinatura (evita mismatch).
    if (firstChargeId) this.amountByCardChargeId.set(firstChargeId, input.amount.amountInCents)
    return {
      providerSubscriptionId: `sub-${input.subscriptionId.slice(0, 8)}`,
      status: this.subscriptionStatus,
      firstChargeId,
      firstChargeStatus: this.firstChargeStatus,
    }
  }

  async getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription> {
    return {
      amountInCents: this.recurringAmounts.get(providerSubscriptionId),
      providerSubscriptionId,
      status: this.subscriptionStatus,
      charges: await this.listSubscriptionCharges(providerSubscriptionId),
      nextExecution: this.subscriptionNextExecution,
    }
  }

  subscriptionNextExecution?: string
  readonly recurringAmounts = new Map<string, bigint>()
  preparationCount = 0
  activationCount = 0
  failUpdateSubscriptionAmount = false
  async prepareCardSubscription(
    input: Pick<CreateCardSubscriptionInput, 'subscriptionId' | 'planId' | 'amount' | 'itemName'>,
  ) {
    this.preparationCount++
    const providerSubscriptionId = `sub-${input.subscriptionId.slice(0, 8)}`
    const firstChargeId = `subcharge-${input.subscriptionId.slice(0, 8)}`
    this.amountByCardChargeId.set(firstChargeId, input.amount.amountInCents)
    this.recurringAmounts.set(providerSubscriptionId, input.amount.amountInCents)
    return { providerSubscriptionId, firstChargeId }
  }
  async activateCardSubscription(
    id: string,
    input: CreateCardSubscriptionInput,
  ): Promise<CreateCardSubscriptionOutput> {
    this.activationCount++
    if (this.failSubscriptionCreate) throw new Error('Ambiguous activation')
    return {
      providerSubscriptionId: id,
      firstChargeId: `subcharge-${input.subscriptionId.slice(0, 8)}`,
      status: this.subscriptionStatus,
      firstChargeStatus: this.firstChargeStatus,
    }
  }
  async updateSubscriptionAmount(id: string, amount: Money): Promise<void> {
    if (this.failUpdateSubscriptionAmount) throw new Error('Price update unavailable')
    this.recurringAmounts.set(id, amount.amountInCents)
  }

  /**
   * Histórico de ciclos por assinatura no provedor (o que a reconciliação varre).
   * Vazio por padrão — cada teste semeia com `setSubscriptionCharges`.
   */
  readonly chargesBySubscriptionId = new Map<string, ProviderSubscriptionCharge[]>()
  /** Ordem das consultas de histórico — prova rotação entre lotes no worker. */
  readonly listedSubscriptionIds: string[] = []
  /** Assinaturas cuja consulta de histórico deve falhar (isolamento por item). */
  readonly failListChargesIds = new Set<string>()

  setSubscriptionCharges(
    providerSubscriptionId: string,
    charges: ProviderSubscriptionCharge[],
  ): void {
    this.chargesBySubscriptionId.set(providerSubscriptionId, charges)
  }

  async listSubscriptionCharges(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionCharge[]> {
    this.listedSubscriptionIds.push(providerSubscriptionId)
    if (this.failListChargesIds.has(providerSubscriptionId)) {
      throw new Error(`falha simulada ao listar ciclos de ${providerSubscriptionId}`)
    }
    return this.chargesBySubscriptionId.get(providerSubscriptionId) ?? []
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    this.canceledSubscriptionIds.push(providerSubscriptionId)
    this.subscriptionStatus = 'CANCELED'
  }

  readonly updatedCardSubscriptionIds: string[] = []
  readonly retriedSubscriptionChargeIds: string[] = []

  async updateSubscriptionCard(
    providerSubscriptionId: string,
    _paymentToken: string,
  ): Promise<void> {
    this.updatedCardSubscriptionIds.push(providerSubscriptionId)
  }

  async retrySubscriptionCharge(input: { providerPaymentId: string }): Promise<void> {
    this.retriedSubscriptionChargeIds.push(input.providerPaymentId)
  }

  /** Estornos solicitados (para asserts nos testes). */
  readonly refundedPix: Array<{ txid: string; amountInCents: bigint }> = []
  readonly refundedCard: Array<{ providerPaymentId: string; amountInCents: bigint }> = []
  /** Quando true, os estornos lançam (simula falha do provedor). */
  failRefund = false

  async refundPixCharge(input: RefundPixInput): Promise<RefundResult> {
    if (this.failRefund) throw new Error('falha simulada no estorno Pix')
    this.refundedPix.push({ txid: input.txid, amountInCents: input.amount.amountInCents })
    return { providerRefundId: `dev-${input.txid.slice(0, 8)}`, status: 'EM_PROCESSAMENTO' }
  }

  async refundCardCharge(providerPaymentId: string, amount: Money): Promise<RefundResult> {
    if (this.failRefund) throw new Error('falha simulada no estorno de cartão')
    this.refundedCard.push({ providerPaymentId, amountInCents: amount.amountInCents })
    return { providerRefundId: providerPaymentId, status: 'PROCESSING' }
  }

  /** Registra o valor de uma cobrança de ciclo (para getCardCharge não cair no default). */
  setCycleChargeAmount(chargeId: string, amountInCents: bigint): void {
    this.amountByCardChargeId.set(chargeId, amountInCents)
  }
}

export class InMemoryConsumerRepository implements ConsumerRepository {
  private readonly byId = new Map<string, Consumer>()

  add(consumer: Consumer): this {
    this.byId.set(consumer.id, consumer)
    return this
  }

  async findById(consumerId: string): Promise<Consumer | null> {
    const consumer = this.byId.get(consumerId)
    return consumer?.isActive ? consumer : null
  }

  async findSubscribers(eventName: string): Promise<Consumer[]> {
    return [...this.byId.values()].filter(
      (c) => c.isActive && Boolean(c.webhookUrl) && (c.subscribedEvents ?? []).includes(eventName),
    )
  }
}

/**
 * Fake fiel: o dedupe só "fecha" após `markProcessed` (grava processedAt). Um
 * evento registrado mas não processado segue reprocessável.
 *
 * Assinatura COMPLETA do port (`eventType`/`payload` aceitos e armazenados):
 * a chave de dedupe é `(provider, eventId)` — igual à unique do adapter real
 * (`webhook_events (provider, provider_event_id)`); `eventType` NÃO entra na
 * chave. Se essa decisão mudar no real, mude AQUI também.
 */
export class InMemoryWebhookInbox implements WebhookInbox {
  private readonly processed = new Map<string, boolean>()
  /** Último registro por chave — permite asserts sobre eventType/payload. */
  readonly registered = new Map<string, { eventType: string; payload: Record<string, unknown> }>()

  async registerIfNew(input: {
    provider: string
    eventId: string
    eventType: string
    payload: Record<string, unknown>
  }): Promise<boolean> {
    const key = `${input.provider}:${input.eventId}`
    if (!this.registered.has(key)) {
      this.registered.set(key, { eventType: input.eventType, payload: input.payload })
    }
    const seen = this.processed.get(key)
    if (seen === undefined) {
      this.processed.set(key, false) // registrado, ainda não processado
      return true
    }
    return seen === false // reprocessável enquanto não processado
  }

  async markProcessed(provider: string, eventId: string): Promise<void> {
    this.processed.set(`${provider}:${eventId}`, true)
  }
}

/** Repositório de assinaturas em memória (espelha o de pagamento). */
export class InMemorySubscriptionRepository implements SubscriptionRepository {
  readonly byId = new Map<string, SubscriptionAggregate>()
  readonly outbox: OutboxMessage[] = []
  private readonly paidCycleIds = new Set<string>()
  private readonly lastReconciledAt = new Map<string, Date>()
  private readonly cancellationLeaseUntil = new Map<string, Date>()

  async save(subscription: SubscriptionAggregate): Promise<void> {
    const existing = this.byId.get(subscription.id)
    if (existing && existing.version !== subscription.version) {
      throw new ConcurrencyConflictError(subscription.id)
    }
    for (const event of subscription.pullEvents()) {
      if (event.eventName === 'subscription.charge_paid') {
        const chargeId = event.toPayload().chargeId
        if (typeof chargeId === 'string') this.paidCycleIds.add(`${subscription.id}:${chargeId}`)
      }
      this.outbox.push({
        id: crypto.randomUUID(),
        aggregateId: event.aggregateId,
        eventName: event.eventName,
        payload: event.toPayload(),
        attemptCount: 0,
        createdAt: new Date(),
      })
    }
    const snap = subscription.toSnapshot()
    if (existing) snap.version = subscription.version + 1
    this.byId.set(subscription.id, SubscriptionAggregate.restore(snap))
  }

  async recordPaidCycle(
    input: Parameters<SubscriptionRepository['recordPaidCycle']>[0],
  ): Promise<void> {
    const subscription = await this.findById(input.subscriptionId)
    if (
      !subscription ||
      subscription.consumerId !== input.consumerId ||
      subscription.provider !== input.provider ||
      subscription.providerSubscriptionId !== input.providerSubscriptionId
    )
      throw new Error('Subscription ownership changed')
    const key = `${input.subscriptionId}:${input.chargeId}`
    if (this.paidCycleIds.has(key) || subscription.toSnapshot().lastChargeId === input.chargeId)
      return
    if (subscription.status === 'PENDING') subscription.activate()
    subscription.recordCharge(input.chargeId, input.paidAt)
    await this.save(subscription)
  }

  async findById(id: string): Promise<SubscriptionAggregate | null> {
    const found = this.byId.get(id)
    return found ? SubscriptionAggregate.restore(found.toSnapshot()) : null
  }

  async findByIdempotencyKey(
    consumerId: string,
    idempotencyKey: string,
  ): Promise<SubscriptionAggregate | null> {
    for (const s of this.byId.values()) {
      if (s.consumerId === consumerId && s.idempotencyKey === idempotencyKey) {
        return SubscriptionAggregate.restore(s.toSnapshot())
      }
    }
    return null
  }

  async findByProviderSubscriptionId(
    provider: string,
    providerSubscriptionId: string,
  ): Promise<SubscriptionAggregate | null> {
    for (const s of this.byId.values()) {
      if (s.provider === provider && s.providerSubscriptionId === providerSubscriptionId) {
        return SubscriptionAggregate.restore(s.toSnapshot())
      }
    }
    return null
  }

  async claimActiveForReconcile(limit: number): Promise<SubscriptionAggregate[]> {
    const claimed = [...this.byId.values()]
      .filter((s) => s.status === 'ACTIVE' && s.providerSubscriptionId)
      .sort((a, b) => {
        const reconcileOrder =
          (this.lastReconciledAt.get(a.id)?.getTime() ?? Number.NEGATIVE_INFINITY) -
          (this.lastReconciledAt.get(b.id)?.getTime() ?? Number.NEGATIVE_INFINITY)
        if (reconcileOrder !== 0) return reconcileOrder
        const chargeOrder =
          (a.lastChargeAt?.getTime() ?? Number.NEGATIVE_INFINITY) -
          (b.lastChargeAt?.getTime() ?? Number.NEGATIVE_INFINITY)
        return chargeOrder !== 0 ? chargeOrder : a.id.localeCompare(b.id)
      })
      .slice(0, limit)
    const claimedAt = new Date()
    for (const subscription of claimed) this.lastReconciledAt.set(subscription.id, claimedAt)
    return claimed.map((s) => SubscriptionAggregate.restore(s.toSnapshot()))
  }

  async claimFirstChargeSetups(limit: number): Promise<SubscriptionAggregate[]> {
    return [...this.byId.values()]
      .filter(
        (s) =>
          s.firstChargePricing &&
          !s.firstChargePricing.renewalPriceConfirmed &&
          s.providerSubscriptionId &&
          ['ACTIVE', 'PENDING'].includes(s.status),
      )
      .slice(0, limit)
      .map((s) => SubscriptionAggregate.restore(s.toSnapshot()))
  }

  async claimCancellationRequests(
    limit: number,
    leaseMs: number,
  ): Promise<SubscriptionAggregate[]> {
    const now = new Date()
    const claimed = [...this.byId.values()]
      .filter(
        (subscription) =>
          subscription.cancelRequestedAt &&
          subscription.cancellationRecord?.origin !== 'NONPAYMENT' &&
          ['ACTIVE', 'PENDING'].includes(subscription.status) &&
          (this.cancellationLeaseUntil.get(subscription.id)?.getTime() ?? 0) <= now.getTime(),
      )
      .slice(0, limit)
    for (const subscription of claimed)
      this.cancellationLeaseUntil.set(subscription.id, new Date(now.getTime() + leaseMs))
    return claimed.map((subscription) => SubscriptionAggregate.restore(subscription.toSnapshot()))
  }
}

/** Registro de planos em memória (modela get-or-create + ON CONFLICT DO NOTHING). */
export class InMemorySubscriptionPlanRegistry implements SubscriptionPlanRegistry {
  private readonly map = new Map<string, string>()
  registerCount = 0

  private key(provider: string, intervalMonths: number, repeats: number | null): string {
    return `${provider}:${intervalMonths}:${repeats ?? -1}`
  }

  async find(
    provider: string,
    intervalMonths: number,
    repeats: number | null,
  ): Promise<string | null> {
    return this.map.get(this.key(provider, intervalMonths, repeats)) ?? null
  }

  async register(input: {
    provider: string
    intervalMonths: number
    repeats: number | null
    providerPlanId: string
    name: string
  }): Promise<string> {
    this.registerCount++
    const k = this.key(input.provider, input.intervalMonths, input.repeats)
    const existing = this.map.get(k)
    if (existing) return existing // ON CONFLICT DO NOTHING → reusa o vencedor
    this.map.set(k, input.providerPlanId)
    return input.providerPlanId
  }
}
