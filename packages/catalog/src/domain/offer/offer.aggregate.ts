import { AggregateRoot } from '../shared/aggregate-root'
import { InvalidStateTransitionError, ValidationError } from '../shared/errors'
import { type Currency, Money } from '../value-objects/money'
import type { Sku } from '../value-objects/sku'
import type { Slug } from '../value-objects/slug'
import { OfferCreatedEvent, OfferUpdatedEvent } from './offer.events'
import { DEFAULT_OFFER_STATUS, type OfferStatus } from './offer.status'
import { DEFAULT_PRICING_MODE, type PricingMode } from './pricing-mode'

/** Produto adicional que a oferta concede além do principal (variação por oferta). */
export interface OfferItem {
  productId: string
  sortOrder: number
}

/** Núcleo comercial de apresentação que o funil renderiza (a copy longa fica no funil). */
export interface OfferContent {
  badge?: string
  ctaLabel?: string
  highlight?: string
  /**
   * Habilita o campo de cupom no checkout do funil (opt-in). Ausente/`false` →
   * o funil NÃO exibe o cupom (ex.: produto de entrada de baixo valor, onde não
   * faz sentido). Defina `true` nas ofertas que aceitam cupom.
   */
  allowsCoupon?: boolean
  /**
   * Teto de PERFIS (estilo Netflix) que ESTA oferta libera (plataforma kids — planos
   * "N perfis"). Inteiro ≥ 1; ausente = sem teto por esta oferta (o members aplica o
   * default). Injetado no `fulfillment` resolvido em `/entitlements` → congela no
   * snapshot da matrícula. Mora na OFERTA (não no produto) — ofertas diferentes do
   * mesmo produto podem dar quantidades diferentes.
   */
  maxProfiles?: number
  /**
   * OFERTA IRMÃ do alternador do checkout ("economize no anual"): a mensal aponta
   * a anual e vice-versa. `slug` = a oferta alvo (o funil VALIDA o slug escolhido
   * contra este link — anti-forja); `label` = o texto do alternador (ausente → o
   * funil usa um default por intervalo). Autorado no admin, nos DOIS sentidos.
   */
  altOffer?: { slug: string; label?: string }
}

/** Estado serializável da oferta (ida/volta ao banco). */
export interface OfferSnapshot {
  id: string
  version: number
  productId: string
  code: string
  slug: string
  name: string
  status: OfferStatus
  priceCents: number
  compareAtPriceCents: number | null
  currency: Currency
  pricingMode: PricingMode
  /**
   * Periodicidade da ASSINATURA em meses (mensal = 1, anual = 12). Só faz sentido
   * com `pricingMode: 'subscription'` (one_time normaliza p/ null); oferta de
   * assinatura ATIVA exige o valor — é o que o funil manda ao payments como
   * `intervalMonths` do plano Efí.
   */
  billingIntervalMonths: number | null
  installmentsMax: number | null
  trialDays: number | null
  guaranteeDays: number | null
  availableFrom: Date | null
  availableUntil: Date | null
  content: OfferContent | null
  metadata: Record<string, unknown> | null
  items: OfferItem[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateOfferInput {
  id: string
  productId: string
  code: Sku
  slug: Slug
  name: string
  priceCents: number
  compareAtPriceCents?: number | null
  currency?: Currency
  pricingMode?: PricingMode
  billingIntervalMonths?: number | null
  installmentsMax?: number | null
  trialDays?: number | null
  guaranteeDays?: number | null
  availableFrom?: Date | null
  availableUntil?: Date | null
  content?: OfferContent | null
  metadata?: Record<string, unknown> | null
  status?: OfferStatus
  items?: OfferItem[]
  now?: Date
}

export interface UpdateOfferDetails {
  name?: string
  priceCents?: number
  compareAtPriceCents?: number | null
  pricingMode?: PricingMode
  billingIntervalMonths?: number | null
  installmentsMax?: number | null
  trialDays?: number | null
  guaranteeDays?: number | null
  availableFrom?: Date | null
  availableUntil?: Date | null
  content?: OfferContent | null
  metadata?: Record<string, unknown> | null
  now?: Date
}

interface OfferProps {
  version: number
  productId: string
  code: string
  slug: string
  name: string
  status: OfferStatus
  priceCents: number
  compareAtPriceCents: number | null
  currency: Currency
  pricingMode: PricingMode
  billingIntervalMonths: number | null
  installmentsMax: number | null
  trialDays: number | null
  guaranteeDays: number | null
  availableFrom: Date | null
  availableUntil: Date | null
  content: OfferContent | null
  metadata: Record<string, unknown> | null
  items: OfferItem[]
  createdAt: Date
  updatedAt: Date
}

// Transições permitidas (qualquer estado pode ser arquivado).
const ALLOWED_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  draft: ['active', 'archived'],
  active: ['paused', 'archived'],
  paused: ['active', 'archived'],
  archived: [],
}

/**
 * Agregado de oferta: a unidade de venda. Carrega o PREÇO (o produto não tem) e o
 * que mais é concedido (`items`). Identidade = `id` (uuid).
 */
export class OfferAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: OfferProps,
  ) {
    super(id)
  }

  static create(input: CreateOfferInput): OfferAggregate {
    const now = input.now ?? new Date()
    const name = input.name.trim()
    if (!name) throw new ValidationError('Nome da oferta é obrigatório')
    if (!input.productId) throw new ValidationError('Oferta exige um produto principal')

    const currency = input.currency ?? 'BRL'
    assertPositivePrice(input.priceCents, currency)
    assertCompareAt(input.compareAtPriceCents, input.priceCents, currency)
    assertAvailabilityWindow(input.availableFrom ?? null, input.availableUntil ?? null)

    const offer = new OfferAggregate(input.id, {
      version: 0,
      productId: input.productId,
      code: input.code.value,
      slug: input.slug.value,
      name,
      status: input.status ?? DEFAULT_OFFER_STATUS,
      priceCents: input.priceCents,
      compareAtPriceCents: input.compareAtPriceCents ?? null,
      currency,
      pricingMode: input.pricingMode ?? DEFAULT_PRICING_MODE,
      billingIntervalMonths: normalizeBillingInterval(
        input.pricingMode ?? DEFAULT_PRICING_MODE,
        input.billingIntervalMonths,
      ),
      installmentsMax: nullablePositiveInt(input.installmentsMax, 'installmentsMax'),
      trialDays: nullablePositiveInt(input.trialDays, 'trialDays'),
      guaranteeDays: nullablePositiveInt(input.guaranteeDays, 'guaranteeDays'),
      availableFrom: input.availableFrom ?? null,
      availableUntil: input.availableUntil ?? null,
      content: input.content ?? null,
      metadata: input.metadata ?? null,
      items: normalizeItems(input.productId, input.items ?? []),
      createdAt: now,
      updatedAt: now,
    })
    assertSubscriptionInterval(offer.props)
    offer.addEvent(
      new OfferCreatedEvent(
        offer.id,
        offer.props.code,
        offer.props.productId,
        offer.props.priceCents,
      ),
    )
    return offer
  }

  static restore(snapshot: OfferSnapshot): OfferAggregate {
    const { id, ...rest } = snapshot
    return new OfferAggregate(id, { ...rest, items: [...rest.items] })
  }

  toSnapshot(): OfferSnapshot {
    return { id: this.id, ...this.props, items: [...this.props.items] }
  }

  updateDetails(details: UpdateOfferDetails): void {
    if (details.name !== undefined) {
      const name = details.name.trim()
      if (!name) throw new ValidationError('Nome da oferta é obrigatório')
      this.props.name = name
    }
    if (details.priceCents !== undefined) {
      assertPositivePrice(details.priceCents, this.props.currency)
      this.props.priceCents = details.priceCents
    }
    if (details.compareAtPriceCents !== undefined) {
      assertCompareAt(details.compareAtPriceCents, this.props.priceCents, this.props.currency)
      this.props.compareAtPriceCents = details.compareAtPriceCents
    } else if (details.priceCents !== undefined) {
      // Preço mudou sem tocar o compareAt: revalida o invariante contra o
      // EXISTENTE — subir o preço acima do "de" criaria um "de R$X por R$Y"
      // invertido na página de vendas (precificação enganosa).
      assertCompareAt(this.props.compareAtPriceCents, this.props.priceCents, this.props.currency)
    }
    if (details.pricingMode !== undefined) this.props.pricingMode = details.pricingMode
    if (details.billingIntervalMonths !== undefined) {
      this.props.billingIntervalMonths = nullablePositiveInt(
        details.billingIntervalMonths,
        'billingIntervalMonths',
      )
    }
    // Estado consolidado: one_time não carrega intervalo (normaliza); assinatura
    // ATIVA exige o intervalo (o funil/payments dependem dele p/ o plano Efí).
    this.props.billingIntervalMonths = normalizeBillingInterval(
      this.props.pricingMode,
      this.props.billingIntervalMonths,
    )
    assertSubscriptionInterval(this.props)
    if (details.installmentsMax !== undefined)
      this.props.installmentsMax = nullablePositiveInt(details.installmentsMax, 'installmentsMax')
    if (details.trialDays !== undefined)
      this.props.trialDays = nullablePositiveInt(details.trialDays, 'trialDays')
    if (details.guaranteeDays !== undefined)
      this.props.guaranteeDays = nullablePositiveInt(details.guaranteeDays, 'guaranteeDays')
    if (details.availableFrom !== undefined) this.props.availableFrom = details.availableFrom
    if (details.availableUntil !== undefined) this.props.availableUntil = details.availableUntil
    // Sobre o estado CONSOLIDADO (espelha o assertWindow do cupom): janela
    // invertida tornaria a oferta permanentemente indisponível sem nenhum erro.
    assertAvailabilityWindow(this.props.availableFrom, this.props.availableUntil)
    if (details.content !== undefined) this.props.content = details.content
    if (details.metadata !== undefined) this.props.metadata = details.metadata
    this.touch(details.now)
    this.addEvent(new OfferUpdatedEvent(this.id, 'details'))
  }

  /** Substitui os itens adicionais concedidos pela oferta. */
  setItems(items: OfferItem[], now?: Date): void {
    this.props.items = normalizeItems(this.props.productId, items)
    this.touch(now)
    this.addEvent(new OfferUpdatedEvent(this.id, 'items'))
  }

  setStatus(status: OfferStatus, now?: Date): void {
    if (status === this.props.status) return
    const allowed = ALLOWED_TRANSITIONS[this.props.status]
    if (!allowed.includes(status)) {
      throw new InvalidStateTransitionError(
        `Transição de oferta inválida: ${this.props.status} → ${status}`,
      )
    }
    this.props.status = status
    // Ativar uma oferta de assinatura sem periodicidade venderia um plano que o
    // payments não sabe cobrar — barra na ATIVAÇÃO (rascunho segue livre).
    assertSubscriptionInterval(this.props)
    this.touch(now)
    this.addEvent(new OfferUpdatedEvent(this.id, `status:${status}`))
  }

  /** À venda agora: ativa e dentro da janela de disponibilidade. */
  isAvailable(now: Date = new Date()): boolean {
    if (this.props.status !== 'active') return false
    if (this.props.availableFrom && now < this.props.availableFrom) return false
    if (this.props.availableUntil && now > this.props.availableUntil) return false
    return true
  }

  private touch(now?: Date): void {
    this.props.updatedAt = now ?? new Date()
  }

  get version(): number {
    return this.props.version
  }
  get productId(): string {
    return this.props.productId
  }
  get code(): string {
    return this.props.code
  }
  get slug(): string {
    return this.props.slug
  }
  get name(): string {
    return this.props.name
  }
  get status(): OfferStatus {
    return this.props.status
  }
  get priceCents(): number {
    return this.props.priceCents
  }
  get compareAtPriceCents(): number | null {
    return this.props.compareAtPriceCents
  }
  get currency(): Currency {
    return this.props.currency
  }
  get pricingMode(): PricingMode {
    return this.props.pricingMode
  }
  get billingIntervalMonths(): number | null {
    return this.props.billingIntervalMonths
  }
  get installmentsMax(): number | null {
    return this.props.installmentsMax
  }
  get trialDays(): number | null {
    return this.props.trialDays
  }
  get guaranteeDays(): number | null {
    return this.props.guaranteeDays
  }
  get availableFrom(): Date | null {
    return this.props.availableFrom
  }
  get availableUntil(): Date | null {
    return this.props.availableUntil
  }
  get content(): OfferContent | null {
    return this.props.content
  }
  get metadata(): Record<string, unknown> | null {
    return this.props.metadata
  }
  get items(): readonly OfferItem[] {
    return this.props.items
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}

function assertCompareAt(
  compareAt: number | null | undefined,
  price: number,
  currency: Currency,
): void {
  if (compareAt === null || compareAt === undefined) return
  Money.fromCents(compareAt, currency)
  if (compareAt < price) {
    throw new ValidationError('O preço "de" (compareAt) não pode ser menor que o preço de venda')
  }
}

function assertPositivePrice(price: number, currency: Currency): void {
  const money = Money.fromCents(price, currency)
  if (!money.isPositive()) {
    throw new ValidationError('Preço da oferta precisa ser maior que zero')
  }
}

/** Janela de disponibilidade coerente: `availableUntil` posterior a `availableFrom`. */
function assertAvailabilityWindow(from: Date | null, until: Date | null): void {
  if (from && until && until.getTime() <= from.getTime()) {
    throw new ValidationError('availableUntil deve ser posterior a availableFrom')
  }
}

function nullablePositiveInt(value: number | null | undefined, field: string): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} deve ser um inteiro positivo`)
  }
  return value
}

/** `one_time` não carrega periodicidade (normaliza p/ null); assinatura valida ≥1. */
function normalizeBillingInterval(
  mode: PricingMode,
  value: number | null | undefined,
): number | null {
  if (mode !== 'subscription') return null
  return nullablePositiveInt(value, 'billingIntervalMonths')
}

/**
 * Oferta de ASSINATURA ativa exige a periodicidade (mensal = 1, anual = 12) — sem
 * ela o checkout não sabe montar o plano no provedor. Rascunho/pausada segue livre
 * (cadastro progressivo, régua do `assertCoherent` do produto).
 */
function assertSubscriptionInterval(props: OfferProps): void {
  if (
    props.status === 'active' &&
    props.pricingMode === 'subscription' &&
    props.billingIntervalMonths === null
  ) {
    throw new ValidationError(
      'Oferta de assinatura ativa exige o intervalo de cobrança (mensal = 1, anual = 12)',
    )
  }
}

function normalizeItems(offerProductId: string, items: OfferItem[]): OfferItem[] {
  const seen = new Set<string>()
  for (const item of items) {
    if (item.productId === offerProductId) {
      throw new ValidationError('O produto principal não deve ser repetido como item da oferta')
    }
    if (seen.has(item.productId)) {
      throw new ValidationError('Item de oferta duplicado')
    }
    seen.add(item.productId)
  }
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}
