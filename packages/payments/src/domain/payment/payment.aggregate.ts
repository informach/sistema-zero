import { AggregateRoot } from '../shared/aggregate-root'
import { InvalidStateTransitionError, ValidationError } from '../shared/errors'
import { type Address, Customer } from '../value-objects/customer'
import type { IdempotencyKey } from '../value-objects/idempotency-key'
import { type Currency, Money } from '../value-objects/money'
import {
  type CardData,
  PaymentMethod,
  type PaymentMethodType,
} from '../value-objects/payment-method'
import {
  PaymentCreatedEvent,
  PaymentExpiredEvent,
  PaymentFailedEvent,
  PaymentPaidEvent,
  PaymentRefundedEvent,
} from './payment.events'
import { canTransition, PaymentStatus } from './payment.status'

/** Dados do QR Code Pix retornados pelo provedor. */
export interface PixQrCode {
  copiaECola: string
  imagemQrcodeBase64?: string
  locationId?: string
}

/** Dados do boleto retornados pelo provedor (linha digitável, código de barras, PDF). */
export interface BoletoDetails {
  barcode: string
  digitableLine: string
  pdfUrl: string
}

/**
 * Parâmetros da cobrança de boleto informados na requisição. Persistidos no
 * agregado para que a criação **assíncrona** (ChargeCreationWorker) consiga
 * emitir o boleto depois, com os mesmos dados (vencimento, multa/juros, etc.).
 */
export interface BoletoRequest {
  /** Vencimento já resolvido (YYYY-MM-DD) no momento da requisição. */
  dueDate: string
  fine?: number
  interest?: number
  discount?: number
  message?: string
  daysToWriteOff?: number
}

interface CustomerSnapshot {
  name: string
  email: string
  document: string
  phone?: string
  address?: Address
}

/** Representação serializável do agregado, usada pela camada de persistência. */
export interface PaymentSnapshot {
  id: string
  /** Versão para controle de concorrência otimista (bumped a cada gravação). */
  version: number
  consumerId: string
  amountInCents: bigint
  currency: Currency
  methodType: PaymentMethodType
  card: CardData | null
  status: PaymentStatus
  provider: string
  idempotencyKey: string
  providerPaymentId: string | null
  txid: string | null
  pixQrCode: PixQrCode | null
  boleto: BoletoDetails | null
  boletoRequest: BoletoRequest | null
  customer: CustomerSnapshot | null
  description: string | null
  metadata: Record<string, unknown>
  failureReason: string | null
  /** Assinatura-pai quando este pagamento é um ciclo recorrente (senão null). */
  subscriptionId: string | null
  createdAt: Date
  updatedAt: Date
  paidAt: Date | null
  expiresAt: Date | null
}

interface PaymentState {
  version: number
  consumerId: string
  amount: Money
  method: PaymentMethod
  status: PaymentStatus
  provider: string
  idempotencyKey: string
  providerPaymentId: string | null
  txid: string | null
  pixQrCode: PixQrCode | null
  boleto: BoletoDetails | null
  boletoRequest: BoletoRequest | null
  customer: Customer | null
  description: string | null
  metadata: Record<string, unknown>
  failureReason: string | null
  subscriptionId: string | null
  createdAt: Date
  updatedAt: Date
  paidAt: Date | null
  expiresAt: Date | null
}

/**
 * Raiz do agregado de pagamento. Concentra as invariantes e a máquina de
 * estados; transições inválidas lançam erro de domínio. Eventos de domínio são
 * acumulados e drenados pela camada de aplicação.
 */
export class PaymentAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private readonly state: PaymentState,
    /** true = ainda não persistido (INSERT); false = carregado do banco (UPDATE). */
    private readonly _isNew: boolean,
  ) {
    super(id)
  }

  /** Cria um novo pagamento no estado PENDING e registra o evento de criação. */
  static create(input: {
    id?: string
    consumerId: string
    amount: Money
    method: PaymentMethod
    idempotencyKey: IdempotencyKey
    customer?: Customer
    description?: string
    metadata?: Record<string, unknown>
    /** Parâmetros do boleto (persistidos p/ criação assíncrona). */
    boletoRequest?: BoletoRequest
    /** Assinatura-pai quando este pagamento é um ciclo recorrente. */
    subscriptionId?: string
  }): PaymentAggregate {
    if (!input.amount.isPositive()) {
      throw new ValidationError('Valor do pagamento deve ser positivo')
    }
    if (!input.consumerId) {
      throw new ValidationError('consumerId é obrigatório')
    }

    const id = input.id ?? crypto.randomUUID()
    const now = new Date()

    const payment = new PaymentAggregate(
      id,
      {
        version: 0,
        consumerId: input.consumerId,
        amount: input.amount,
        method: input.method,
        status: PaymentStatus.PENDING,
        provider: 'EFI',
        idempotencyKey: input.idempotencyKey.value,
        providerPaymentId: null,
        txid: null,
        pixQrCode: null,
        boleto: null,
        boletoRequest: input.boletoRequest ?? null,
        customer: input.customer ?? null,
        description: input.description ?? null,
        // Cópia defensiva: guardar a referência do caller permitiria mutação
        // por fora da fronteira do agregado (aliasing).
        metadata: { ...(input.metadata ?? {}) },
        failureReason: null,
        subscriptionId: input.subscriptionId ?? null,
        createdAt: now,
        updatedAt: now,
        paidAt: null,
        expiresAt: null,
      },
      true,
    )

    payment.addEvent(
      new PaymentCreatedEvent(id, {
        consumerId: input.consumerId,
        amountInCents: input.amount.amountInCents.toString(),
        currency: input.amount.currency,
        method: input.method.type,
        idempotencyKey: input.idempotencyKey.value,
      }),
    )

    return payment
  }

  /**
   * Reconstrói o agregado a partir do estado persistido (sem emitir eventos).
   * Reconstituição CONFIA no estado já validado na entrada — não revalida regras
   * de negócio (um endurecimento futuro de validação não pode tornar um
   * pagamento já persistido ilegível/inestornável) — mas falha ALTO em estado
   * estruturalmente impossível, em vez de mascarar corrupção.
   */
  static restore(snapshot: PaymentSnapshot): PaymentAggregate {
    const amount = Money.fromCents(snapshot.amountInCents, snapshot.currency)
    let method: PaymentMethod
    if (snapshot.methodType === 'CREDIT_CARD') {
      if (!snapshot.card) {
        // Sem fallback silencioso (cairia em PIX e um save regravaria o
        // methodType errado por cima — corrupção persistente).
        throw new Error(
          `Pagamento ${snapshot.id} é CREDIT_CARD mas não tem dados de cartão persistidos`,
        )
      }
      // O token NÃO é persistido (single-use, consumido na cobrança — ver
      // snapshotToRow) → reidrata via `storedCard`, que preserva as parcelas e
      // tolera linhas legadas com token.
      method = PaymentMethod.storedCard(snapshot.card)
    } else if (snapshot.methodType === 'BOLETO') {
      method = PaymentMethod.boleto()
    } else {
      method = PaymentMethod.pix()
    }
    const customer = snapshot.customer ? Customer.restore(snapshot.customer) : null

    return new PaymentAggregate(
      snapshot.id,
      {
        version: snapshot.version,
        consumerId: snapshot.consumerId,
        amount,
        method,
        status: snapshot.status,
        provider: snapshot.provider,
        idempotencyKey: snapshot.idempotencyKey,
        providerPaymentId: snapshot.providerPaymentId,
        txid: snapshot.txid,
        pixQrCode: snapshot.pixQrCode,
        boleto: snapshot.boleto,
        boletoRequest: snapshot.boletoRequest,
        customer,
        description: snapshot.description,
        metadata: { ...snapshot.metadata },
        failureReason: snapshot.failureReason,
        subscriptionId: snapshot.subscriptionId,
        createdAt: snapshot.createdAt,
        updatedAt: snapshot.updatedAt,
        paidAt: snapshot.paidAt,
        expiresAt: snapshot.expiresAt,
      },
      false,
    )
  }

  // ── Comandos (transições de estado) ──────────────────────────────────────

  /**
   * Enriquecimento após o provedor criar a cobrança (id externo, txid, QR Code).
   * Não altera o status — o pagamento continua PENDING aguardando confirmação.
   */
  registerProviderCharge(input: {
    providerPaymentId: string
    txid?: string
    pixQrCode?: PixQrCode
    boleto?: BoletoDetails
    expiresAt?: Date
  }): void {
    if (this.state.status !== PaymentStatus.PENDING) {
      throw new InvalidStateTransitionError(
        `Não é possível anexar dados do provedor a um pagamento ${this.state.status}`,
      )
    }
    this.state.providerPaymentId = input.providerPaymentId
    if (input.txid !== undefined) this.state.txid = input.txid
    if (input.pixQrCode !== undefined) this.state.pixQrCode = input.pixQrCode
    if (input.boleto !== undefined) this.state.boleto = input.boleto
    if (input.expiresAt !== undefined) this.state.expiresAt = input.expiresAt
    this.touch()
  }

  markPaid(paidAt?: Date): void {
    // Idempotente: se já está pago, não reprocessa nem reemite evento.
    if (this.state.status === PaymentStatus.PAID) return
    this.transitionTo(PaymentStatus.PAID)
    // Defesa em profundidade: um `Date` inválido (timestamp garbage do provedor)
    // faria `toISOString()` abaixo lançar e travaria a confirmação. Cai para "agora".
    this.state.paidAt = paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : new Date()
    this.addEvent(
      new PaymentPaidEvent(this.id, {
        consumerId: this.state.consumerId,
        providerPaymentId: this.state.providerPaymentId,
        txid: this.state.txid,
        paidAt: this.state.paidAt.toISOString(),
        subscriptionId: this.state.subscriptionId,
      }),
    )
  }

  markFailed(reason: string): void {
    // Idempotente (como `markPaid`): sob entrega ≥1 vez, re-marcar um estado
    // terminal já alcançado é no-op — não lança nem reemite evento.
    if (this.state.status === PaymentStatus.FAILED) return
    this.transitionTo(PaymentStatus.FAILED)
    this.state.failureReason = reason
    this.addEvent(
      new PaymentFailedEvent(this.id, {
        consumerId: this.state.consumerId,
        reason,
        subscriptionId: this.state.subscriptionId,
      }),
    )
  }

  markExpired(): void {
    // Idempotente (como `markPaid`).
    if (this.state.status === PaymentStatus.EXPIRED) return
    this.transitionTo(PaymentStatus.EXPIRED)
    this.addEvent(new PaymentExpiredEvent(this.id, { consumerId: this.state.consumerId }))
  }

  /**
   * Marca como estornado (PAID → REFUNDED). Opcionalmente registra os dados do
   * estorno em `metadata` (id da devolução no provedor + data) — sem coluna nova.
   */
  refund(info?: { providerRefundId?: string; refundedAt?: Date }): void {
    this.transitionTo(PaymentStatus.REFUNDED)
    if (info?.providerRefundId || info?.refundedAt) {
      this.state.metadata = {
        ...this.state.metadata,
        ...(info.refundedAt ? { refundedAt: info.refundedAt.toISOString() } : {}),
        ...(info.providerRefundId ? { providerRefundId: info.providerRefundId } : {}),
      }
    }
    this.addEvent(new PaymentRefundedEvent(this.id, { consumerId: this.state.consumerId }))
  }

  /**
   * Registra divergência entre o valor PAGO no provedor e o valor cobrado
   * (`metadata.amountMismatch`) — NÃO muda o status (fica PENDING, revisão
   * manual) nem emite evento. Durável e contável: alimenta o contador de
   * `/metrics`/`/ops` e aparece no detalhe do pagamento no painel admin.
   * Idempotente: já flagado → no-op e retorna `false` (o chamador pula o save —
   * senão a reconciliação re-salvaria o mesmo flag a cada varredura).
   */
  flagAmountMismatch(info: { expectedInCents: bigint; paidInCents: bigint }): boolean {
    if (this.state.metadata.amountMismatch) return false
    this.state.metadata = {
      ...this.state.metadata,
      amountMismatch: {
        expected: info.expectedInCents.toString(),
        got: info.paidInCents.toString(),
        at: new Date().toISOString(),
      },
    }
    this.touch()
    return true
  }

  private transitionTo(target: PaymentStatus): void {
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

  /** Versão carregada (base do controle de concorrência otimista no `save`). */
  get version(): number {
    return this.state.version
  }

  /** true enquanto o agregado nunca foi persistido (decide INSERT vs UPDATE). */
  get isNew(): boolean {
    return this._isNew
  }

  get consumerId(): string {
    return this.state.consumerId
  }

  get amount(): Money {
    return this.state.amount
  }

  get method(): PaymentMethod {
    return this.state.method
  }

  get status(): PaymentStatus {
    return this.state.status
  }

  get provider(): string {
    return this.state.provider
  }

  get idempotencyKey(): string {
    return this.state.idempotencyKey
  }

  get providerPaymentId(): string | null {
    return this.state.providerPaymentId
  }

  get txid(): string | null {
    return this.state.txid
  }

  get pixQrCode(): PixQrCode | null {
    return this.state.pixQrCode
  }

  get boleto(): BoletoDetails | null {
    return this.state.boleto
  }

  /** Dados seguros do cartão (token/bandeira/last4/parcelas) ou null se não for cartão. */
  get card(): CardData | null {
    return this.state.method.match<CardData | null>({
      pix: () => null,
      boleto: () => null,
      creditCard: (c) => c,
    })
  }

  get boletoRequest(): BoletoRequest | null {
    return this.state.boletoRequest
  }

  get customer(): Customer | null {
    return this.state.customer
  }

  get description(): string | null {
    return this.state.description
  }

  /** Cópia rasa — mutar o retorno não altera o estado interno do agregado. */
  get metadata(): Record<string, unknown> {
    return { ...this.state.metadata }
  }

  /** Id da assinatura-pai quando este pagamento é um ciclo recorrente (senão null). */
  get subscriptionId(): string | null {
    return this.state.subscriptionId
  }

  get createdAt(): Date {
    return this.state.createdAt
  }

  get expiresAt(): Date | null {
    return this.state.expiresAt
  }

  get paidAt(): Date | null {
    return this.state.paidAt
  }

  toSnapshot(): PaymentSnapshot {
    const card = this.state.method.match<CardData | null>({
      pix: () => null,
      boleto: () => null,
      creditCard: (c) => c,
    })

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
      amountInCents: this.state.amount.amountInCents,
      currency: this.state.amount.currency,
      methodType: this.state.method.type,
      card,
      status: this.state.status,
      provider: this.state.provider,
      idempotencyKey: this.state.idempotencyKey,
      providerPaymentId: this.state.providerPaymentId,
      txid: this.state.txid,
      pixQrCode: this.state.pixQrCode,
      boleto: this.state.boleto,
      boletoRequest: this.state.boletoRequest,
      customer,
      description: this.state.description,
      metadata: { ...this.state.metadata },
      failureReason: this.state.failureReason,
      subscriptionId: this.state.subscriptionId,
      createdAt: this.state.createdAt,
      updatedAt: this.state.updatedAt,
      paidAt: this.state.paidAt,
      expiresAt: this.state.expiresAt,
    }
  }
}
