import { AggregateRoot } from '../shared/aggregate-root'
import { ValidationError } from '../shared/errors'
import type { CouponCode } from '../value-objects/coupon-code'
import type { Currency } from '../value-objects/money'
import { CouponExhaustedError, CouponNotApplicableError } from './coupon.errors'
import { CouponCreatedEvent, CouponUpdatedEvent } from './coupon.events'
import { type CouponStatus, DEFAULT_COUPON_STATUS } from './coupon.status'
import type { CouponType } from './coupon.type'

/** Estado serializável do cupom (ida/volta ao banco). */
export interface CouponSnapshot {
  id: string
  version: number
  code: string
  type: CouponType
  percentOff: number | null
  amountOffCents: number | null
  currency: Currency
  status: CouponStatus
  /** Vale para qualquer oferta ativa. Se false, restringe a `offerIds`. */
  appliesToAll: boolean
  minPurchaseCents: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  validFrom: Date | null
  validUntil: Date | null
  metadata: Record<string, unknown> | null
  offerIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateCouponInput {
  id: string
  code: CouponCode
  type: CouponType
  percentOff?: number | null
  amountOffCents?: number | null
  currency?: Currency
  status?: CouponStatus
  appliesToAll?: boolean
  minPurchaseCents?: number | null
  maxRedemptions?: number | null
  validFrom?: Date | null
  validUntil?: Date | null
  metadata?: Record<string, unknown> | null
  offerIds?: string[]
  now?: Date
}

export interface UpdateCouponDetails {
  status?: CouponStatus
  appliesToAll?: boolean
  minPurchaseCents?: number | null
  maxRedemptions?: number | null
  validFrom?: Date | null
  validUntil?: Date | null
  metadata?: Record<string, unknown> | null
  now?: Date
}

interface CouponProps {
  version: number
  code: string
  type: CouponType
  percentOff: number | null
  amountOffCents: number | null
  currency: Currency
  status: CouponStatus
  appliesToAll: boolean
  minPurchaseCents: number | null
  maxRedemptions: number | null
  timesRedeemed: number
  validFrom: Date | null
  validUntil: Date | null
  metadata: Record<string, unknown> | null
  offerIds: string[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Agregado de cupom: desconto aplicável ao PREÇO da oferta (percentual ou fixo),
 * com escopo (todas as ofertas ou específicas), validade, mínimo e limite de usos.
 */
export class CouponAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: CouponProps,
  ) {
    super(id)
  }

  static create(input: CreateCouponInput): CouponAggregate {
    const now = input.now ?? new Date()
    const currency = input.currency ?? 'BRL'
    const { percentOff, amountOffCents } = normalizeDiscount(
      input.type,
      input.percentOff,
      input.amountOffCents,
    )
    assertWindow(input.validFrom ?? null, input.validUntil ?? null)

    const coupon = new CouponAggregate(input.id, {
      version: 0,
      code: input.code.value,
      type: input.type,
      percentOff,
      amountOffCents,
      currency,
      status: input.status ?? DEFAULT_COUPON_STATUS,
      appliesToAll: input.appliesToAll ?? false,
      minPurchaseCents: nullableNonNegativeInt(input.minPurchaseCents, 'minPurchaseCents'),
      maxRedemptions: nullablePositiveInt(input.maxRedemptions, 'maxRedemptions'),
      timesRedeemed: 0,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      metadata: input.metadata ?? null,
      offerIds: dedupe(input.offerIds ?? []),
      createdAt: now,
      updatedAt: now,
    })
    coupon.addEvent(new CouponCreatedEvent(coupon.id, coupon.props.code))
    return coupon
  }

  static restore(snapshot: CouponSnapshot): CouponAggregate {
    const { id, ...rest } = snapshot
    return new CouponAggregate(id, { ...rest, offerIds: [...rest.offerIds] })
  }

  toSnapshot(): CouponSnapshot {
    return { id: this.id, ...this.props, offerIds: [...this.props.offerIds] }
  }

  updateDetails(details: UpdateCouponDetails): void {
    if (details.status !== undefined) this.props.status = details.status
    if (details.appliesToAll !== undefined) this.props.appliesToAll = details.appliesToAll
    if (details.minPurchaseCents !== undefined)
      this.props.minPurchaseCents = nullableNonNegativeInt(
        details.minPurchaseCents,
        'minPurchaseCents',
      )
    if (details.maxRedemptions !== undefined)
      this.props.maxRedemptions = nullablePositiveInt(details.maxRedemptions, 'maxRedemptions')
    if (details.validFrom !== undefined) this.props.validFrom = details.validFrom
    if (details.validUntil !== undefined) this.props.validUntil = details.validUntil
    if (details.metadata !== undefined) this.props.metadata = details.metadata
    assertWindow(this.props.validFrom, this.props.validUntil)
    this.touch(details.now)
    this.addEvent(new CouponUpdatedEvent(this.id, 'details'))
  }

  setOfferIds(offerIds: string[], now?: Date): void {
    this.props.offerIds = dedupe(offerIds)
    this.touch(now)
    this.addEvent(new CouponUpdatedEvent(this.id, 'scope'))
  }

  /**
   * Garante que o cupom pode ser aplicado a uma oferta (status, validade, escopo,
   * mínimo e limite). Lança erro de domínio específico em caso contrário.
   */
  assertApplicable(offerId: string, offerPriceCents: number, now: Date = new Date()): void {
    if (this.props.status !== 'active') throw new CouponNotApplicableError('Cupom inativo')
    if (this.props.validFrom && now < this.props.validFrom)
      throw new CouponNotApplicableError('Cupom ainda não está válido')
    if (this.props.validUntil && now > this.props.validUntil)
      throw new CouponNotApplicableError('Cupom expirado')
    if (this.props.maxRedemptions !== null && this.props.timesRedeemed >= this.props.maxRedemptions)
      throw new CouponExhaustedError()
    if (!this.props.appliesToAll && !this.props.offerIds.includes(offerId))
      throw new CouponNotApplicableError('Cupom não vale para esta oferta')
    if (this.props.minPurchaseCents !== null && offerPriceCents < this.props.minPurchaseCents)
      throw new CouponNotApplicableError('Valor abaixo do mínimo para usar o cupom')
  }

  /** Desconto (centavos) sobre o preço, limitado a [0, preço]. Não valida aplicabilidade. */
  computeDiscountCents(offerPriceCents: number): number {
    let discount: number
    if (this.props.type === 'percent') {
      discount = Math.floor((offerPriceCents * (this.props.percentOff ?? 0)) / 100)
    } else {
      discount = this.props.amountOffCents ?? 0
    }
    return Math.max(0, Math.min(discount, offerPriceCents))
  }

  private touch(now?: Date): void {
    this.props.updatedAt = now ?? new Date()
  }

  get version(): number {
    return this.props.version
  }
  get code(): string {
    return this.props.code
  }
  get type(): CouponType {
    return this.props.type
  }
  get percentOff(): number | null {
    return this.props.percentOff
  }
  get amountOffCents(): number | null {
    return this.props.amountOffCents
  }
  get currency(): Currency {
    return this.props.currency
  }
  get status(): CouponStatus {
    return this.props.status
  }
  get appliesToAll(): boolean {
    return this.props.appliesToAll
  }
  get minPurchaseCents(): number | null {
    return this.props.minPurchaseCents
  }
  get maxRedemptions(): number | null {
    return this.props.maxRedemptions
  }
  get timesRedeemed(): number {
    return this.props.timesRedeemed
  }
  get validFrom(): Date | null {
    return this.props.validFrom
  }
  get validUntil(): Date | null {
    return this.props.validUntil
  }
  get metadata(): Record<string, unknown> | null {
    return this.props.metadata
  }
  get offerIds(): readonly string[] {
    return this.props.offerIds
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}

function normalizeDiscount(
  type: CouponType,
  percentOff: number | null | undefined,
  amountOffCents: number | null | undefined,
): { percentOff: number | null; amountOffCents: number | null } {
  if (type === 'percent') {
    if (percentOff === null || percentOff === undefined)
      throw new ValidationError('Cupom percentual exige percentOff')
    if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100)
      throw new ValidationError('percentOff deve ser um inteiro entre 1 e 100')
    return { percentOff, amountOffCents: null }
  }
  if (amountOffCents === null || amountOffCents === undefined)
    throw new ValidationError('Cupom fixo exige amountOffCents')
  if (!Number.isInteger(amountOffCents) || amountOffCents < 1)
    throw new ValidationError('amountOffCents deve ser um inteiro positivo (centavos)')
  return { percentOff: null, amountOffCents }
}

function assertWindow(from: Date | null, until: Date | null): void {
  if (from && until && until.getTime() <= from.getTime()) {
    throw new ValidationError('validUntil deve ser posterior a validFrom')
  }
}

function nullablePositiveInt(value: number | null | undefined, field: string): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} deve ser um inteiro positivo`)
  }
  return value
}

function nullableNonNegativeInt(value: number | null | undefined, field: string): number | null {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value < 0) {
    throw new ValidationError(`${field} deve ser um inteiro não negativo`)
  }
  return value
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)]
}
