import { AggregateRoot } from '../shared/aggregate-root'
import { InvalidStateTransitionError, ValidationError } from '../shared/errors'
import { type Address, Customer } from '../value-objects/customer'
import type { IdempotencyKey } from '../value-objects/idempotency-key'
import { type Currency, Money } from '../value-objects/money'
import {
  SubscriptionActivatedEvent,
  SubscriptionCanceledEvent,
  SubscriptionChargePaidEvent,
  SubscriptionCreatedEvent,
  SubscriptionExpiredEvent,
} from './subscription.events'
import { canTransition, SubscriptionStatus } from './subscription.status'

/** Cartão da assinatura — apenas dados seguros (PCI): bandeira + últimos dígitos. */
export interface SubscriptionCard {
  brand: string
  last4: string
}

interface CustomerSnapshot {
  name: string
  email: string
  document: string
  phone?: string
  address?: Address
}

/** Representação serializável do agregado, usada pela camada de persistência. */
export interface SubscriptionSnapshot {
  id: string
  version: number
  consumerId: string
  status: SubscriptionStatus
  provider: string
  providerSubscriptionId: string | null
  /** Id do plano na Efí (chaveado por intervalo+repetições; reutilizável). */
  providerPlanId: string
  intervalMonths: number
  repeats: number | null
  amountInCents: bigint
  currency: Currency
  card: SubscriptionCard
  customer: CustomerSnapshot | null
  idempotencyKey: string
  cyclesCompleted: number
  /** Último charge_id contabilizado (torna `recordCharge` idempotente). */
  lastChargeId: string | null
  lastChargeAt: Date | null
  description: string | null
  metadata: Record<string, unknown>
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface SubscriptionState {
  version: number
  consumerId: string
  status: SubscriptionStatus
  provider: string
  providerSubscriptionId: string | null
  providerPlanId: string
  intervalMonths: number
  repeats: number | null
  amount: Money
  card: SubscriptionCard
  customer: Customer | null
  idempotencyKey: string
  cyclesCompleted: number
  lastChargeId: string | null
  lastChargeAt: Date | null
  description: string | null
  metadata: Record<string, unknown>
  canceledAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Raiz do agregado de **assinatura** (recorrência via cartão, API Cobranças da
 * Efí). A Efí gerencia a recorrência: nós criamos plano + assinatura uma vez e
 * ela cobra o cartão guardado a cada ciclo, notificando por token. Este agregado
 * concentra o ciclo de vida (PENDING→ACTIVE→CANCELED/EXPIRED), sincronizado a
 * partir das notificações; não agenda nem dispara cobranças.
 */
export class SubscriptionAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly state: SubscriptionState,
    /** true = ainda não persistido (INSERT); false = carregado do banco (UPDATE). */
    private readonly _isNew: boolean,
  ) {
    super(id)
  }

  /** Cria uma assinatura no estado PENDING e registra o evento de criação. */
  static create(input: {
    id?: string
    consumerId: string
    amount: Money
    card: SubscriptionCard
    providerPlanId: string
    intervalMonths: number
    repeats?: number | null
    idempotencyKey: IdempotencyKey
    customer?: Customer
    description?: string
    metadata?: Record<string, unknown>
  }): SubscriptionAggregate {
    if (!input.amount.isPositive()) {
      throw new ValidationError('Valor da assinatura deve ser positivo')
    }
    if (!input.consumerId) {
      throw new ValidationError('consumerId é obrigatório')
    }
    if (!Number.isInteger(input.intervalMonths) || input.intervalMonths < 1) {
      throw new ValidationError('Intervalo da assinatura deve ser de pelo menos 1 mês')
    }
    const repeats = input.repeats ?? null
    if (repeats !== null && (!Number.isInteger(repeats) || repeats < 1)) {
      throw new ValidationError('Número de repetições inválido')
    }

    const id = input.id ?? crypto.randomUUID()
    const now = new Date()

    const subscription = new SubscriptionAggregate(
      id,
      {
        version: 0,
        consumerId: input.consumerId,
        status: SubscriptionStatus.PENDING,
        provider: 'EFI',
        providerSubscriptionId: null,
        providerPlanId: input.providerPlanId,
        intervalMonths: input.intervalMonths,
        repeats,
        amount: input.amount,
        card: { brand: input.card.brand, last4: input.card.last4 },
        customer: input.customer ?? null,
        idempotencyKey: input.idempotencyKey.value,
        cyclesCompleted: 0,
        lastChargeId: null,
        lastChargeAt: null,
        description: input.description ?? null,
        metadata: input.metadata ?? {},
        canceledAt: null,
        createdAt: now,
        updatedAt: now,
      },
      true,
    )

    subscription.addEvent(
      new SubscriptionCreatedEvent(id, {
        consumerId: input.consumerId,
        amountInCents: input.amount.amountInCents.toString(),
        currency: input.amount.currency,
        intervalMonths: input.intervalMonths,
        repeats,
        idempotencyKey: input.idempotencyKey.value,
      }),
    )

    return subscription
  }

  /** Reconstrói o agregado a partir do estado persistido (sem emitir eventos). */
  static restore(snapshot: SubscriptionSnapshot): SubscriptionAggregate {
    const amount = Money.fromCents(snapshot.amountInCents, snapshot.currency)
    const customer = snapshot.customer ? Customer.create(snapshot.customer) : null

    return new SubscriptionAggregate(
      snapshot.id,
      {
        version: snapshot.version,
        consumerId: snapshot.consumerId,
        status: snapshot.status,
        provider: snapshot.provider,
        providerSubscriptionId: snapshot.providerSubscriptionId,
        providerPlanId: snapshot.providerPlanId,
        intervalMonths: snapshot.intervalMonths,
        repeats: snapshot.repeats,
        amount,
        card: snapshot.card,
        customer,
        idempotencyKey: snapshot.idempotencyKey,
        cyclesCompleted: snapshot.cyclesCompleted,
        lastChargeId: snapshot.lastChargeId,
        lastChargeAt: snapshot.lastChargeAt,
        description: snapshot.description,
        metadata: snapshot.metadata,
        canceledAt: snapshot.canceledAt,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
      },
      false,
    )
  }

  // ── Comandos (transições de estado) ──────────────────────────────────────

  /** Enriquecimento após a Efí criar a assinatura (id externo). Não muda o status. */
  registerProviderSubscription(providerSubscriptionId: string): void {
    if (this.state.status !== SubscriptionStatus.PENDING) {
      throw new InvalidStateTransitionError(
        `Não é possível anexar a assinatura do provedor a uma assinatura ${this.state.status}`,
      )
    }
    this.state.providerSubscriptionId = providerSubscriptionId
    this.touch()
  }

  /** Ativa a assinatura (1ª cobrança paga / status ativo na Efí). Idempotente. */
  activate(): void {
    if (this.state.status === SubscriptionStatus.ACTIVE) return
    this.transitionTo(SubscriptionStatus.ACTIVE)
    this.addEvent(
      new SubscriptionActivatedEvent(this.id, {
        consumerId: this.state.consumerId,
        providerSubscriptionId: this.state.providerSubscriptionId,
      }),
    )
  }

  /**
   * Contabiliza um ciclo cobrado. **Idempotente por `chargeId`** (`lastChargeId`):
   * o mesmo charge processado de novo (ex.: criação + notificação do 1º ciclo)
   * não conta em dobro. Ao atingir o nº de repetições, expira automaticamente.
   */
  recordCharge(chargeId: string, paidAt?: Date): void {
    if (this.state.lastChargeId === chargeId) return
    this.state.lastChargeId = chargeId
    this.state.cyclesCompleted += 1
    this.state.lastChargeAt = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : new Date()
    this.touch()
    this.addEvent(
      new SubscriptionChargePaidEvent(this.id, {
        consumerId: this.state.consumerId,
        chargeId,
        cyclesCompleted: this.state.cyclesCompleted,
        paidAt: this.state.lastChargeAt.toISOString(),
      }),
    )
    if (this.state.repeats !== null && this.state.cyclesCompleted >= this.state.repeats) {
      this.expire()
    }
  }

  /** Cancela a assinatura. Idempotente (cancelar uma já cancelada é no-op). */
  cancel(): void {
    if (this.state.status === SubscriptionStatus.CANCELED) return
    this.transitionTo(SubscriptionStatus.CANCELED)
    this.state.canceledAt = new Date()
    this.addEvent(new SubscriptionCanceledEvent(this.id, { consumerId: this.state.consumerId }))
  }

  /** Expira a assinatura (fim das repetições ou sinal de expiração da Efí). */
  expire(): void {
    if (this.state.status === SubscriptionStatus.EXPIRED) return
    this.transitionTo(SubscriptionStatus.EXPIRED)
    this.addEvent(new SubscriptionExpiredEvent(this.id, { consumerId: this.state.consumerId }))
  }

  private transitionTo(target: SubscriptionStatus): void {
    if (!canTransition(this.state.status, target)) {
      throw new InvalidStateTransitionError(`Transição inválida: ${this.state.status} → ${target}`)
    }
    this.state.status = target
    this.touch()
  }

  private touch(): void {
    this.state.updatedAt = new Date()
  }

  // ── Consultas ─────────────────────────────────────────────────────────────

  get version(): number {
    return this.state.version
  }

  get isNew(): boolean {
    return this._isNew
  }

  get consumerId(): string {
    return this.state.consumerId
  }

  get status(): SubscriptionStatus {
    return this.state.status
  }

  get provider(): string {
    return this.state.provider
  }

  get providerSubscriptionId(): string | null {
    return this.state.providerSubscriptionId
  }

  get providerPlanId(): string {
    return this.state.providerPlanId
  }

  get intervalMonths(): number {
    return this.state.intervalMonths
  }

  get repeats(): number | null {
    return this.state.repeats
  }

  get amount(): Money {
    return this.state.amount
  }

  get card(): SubscriptionCard {
    return this.state.card
  }

  get customer(): Customer | null {
    return this.state.customer
  }

  get idempotencyKey(): string {
    return this.state.idempotencyKey
  }

  get cyclesCompleted(): number {
    return this.state.cyclesCompleted
  }

  get lastChargeAt(): Date | null {
    return this.state.lastChargeAt
  }

  get description(): string | null {
    return this.state.description
  }

  get metadata(): Record<string, unknown> {
    return this.state.metadata
  }

  get canceledAt(): Date | null {
    return this.state.canceledAt
  }

  get createdAt(): Date {
    return this.state.createdAt
  }

  toSnapshot(): SubscriptionSnapshot {
    const customer: CustomerSnapshot | null = this.state.customer
      ? {
          name: this.state.customer.name,
          email: this.state.customer.email,
          document: this.state.customer.document.value,
          phone: this.state.customer.phone,
          address: this.state.customer.address,
        }
      : null

    return {
      id: this.id,
      version: this.state.version,
      consumerId: this.state.consumerId,
      status: this.state.status,
      provider: this.state.provider,
      providerSubscriptionId: this.state.providerSubscriptionId,
      providerPlanId: this.state.providerPlanId,
      intervalMonths: this.state.intervalMonths,
      repeats: this.state.repeats,
      amountInCents: this.state.amount.amountInCents,
      currency: this.state.amount.currency,
      card: this.state.card,
      customer,
      idempotencyKey: this.state.idempotencyKey,
      cyclesCompleted: this.state.cyclesCompleted,
      lastChargeId: this.state.lastChargeId,
      lastChargeAt: this.state.lastChargeAt,
      description: this.state.description,
      metadata: this.state.metadata,
      canceledAt: this.state.canceledAt,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
    }
  }
}
