import { and, count, desc, eq, ilike, inArray, type SQL, sql } from 'drizzle-orm'
import { CouponAggregate, type CouponSnapshot } from '../../../domain/coupon/coupon.aggregate'
import {
  CouponExhaustedError,
  CouponNotFoundError,
  DuplicateCouponError,
} from '../../../domain/coupon/coupon.errors'
import type { CouponStatus } from '../../../domain/coupon/coupon.status'
import type { CouponType } from '../../../domain/coupon/coupon.type'
import type { CouponRepository } from '../../../domain/ports/coupon-repository.port'
import type { ListQuery, Page } from '../../../domain/ports/list'
import { ConcurrencyConflictError } from '../../../domain/shared/concurrency.error'
import type { Currency } from '../../../domain/value-objects/money'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { couponOffers, couponRedemptions, coupons } from './schema'

type CouponRow = typeof coupons.$inferSelect
type CouponOfferRow = typeof couponOffers.$inferSelect

/** Repositório de cupons (Drizzle/Postgres). Cupom + escopo de ofertas. */
export class DrizzleCouponRepository implements CouponRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<CouponAggregate | null> {
    const [row] = await this.db.select().from(coupons).where(eq(coupons.id, id)).limit(1)
    return row ? this.hydrate(row) : null
  }

  async findByCode(code: string): Promise<CouponAggregate | null> {
    const normalized = code.trim().toUpperCase()
    const [row] = await this.db.select().from(coupons).where(eq(coupons.code, normalized)).limit(1)
    return row ? this.hydrate(row) : null
  }

  async list(query: ListQuery): Promise<Page<CouponAggregate>> {
    const where = buildFilter(query)
    const countRows = await this.db.select({ value: count() }).from(coupons).where(where)
    const total = countRows[0]?.value ?? 0
    if (total === 0) return { items: [], total: 0 }
    const rows = await this.db
      .select()
      .from(coupons)
      .where(where)
      .orderBy(desc(coupons.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    if (rows.length === 0) return { items: [], total }
    const scopeRows = await this.db
      .select()
      .from(couponOffers)
      .where(
        inArray(
          couponOffers.couponId,
          rows.map((r) => r.id),
        ),
      )
    const byCoupon = new Map<string, CouponOfferRow[]>()
    for (const s of scopeRows) {
      const list = byCoupon.get(s.couponId)
      if (list) list.push(s)
      else byCoupon.set(s.couponId, [s])
    }
    const items = rows.map((row) =>
      CouponAggregate.restore(toSnapshot(row, byCoupon.get(row.id) ?? [])),
    )
    return { items, total }
  }

  async create(coupon: CouponAggregate): Promise<void> {
    const s = coupon.toSnapshot()
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(coupons).values(toRow(s))
        await insertScope(tx, s.id, s.offerIds)
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateCouponError()
      throw error
    }
  }

  async update(coupon: CouponAggregate): Promise<void> {
    const s = coupon.toSnapshot()
    try {
      await this.db.transaction(async (tx) => {
        const updated = await tx
          .update(coupons)
          .set({
            version: s.version + 1,
            code: s.code,
            type: s.type,
            percentOff: s.percentOff,
            amountOffCents: s.amountOffCents,
            currency: s.currency,
            status: s.status,
            appliesToAll: s.appliesToAll,
            minPurchaseCents: s.minPurchaseCents,
            maxRedemptions: s.maxRedemptions,
            validFrom: s.validFrom,
            validUntil: s.validUntil,
            metadata: s.metadata,
            updatedAt: s.updatedAt,
          })
          .where(and(eq(coupons.id, s.id), eq(coupons.version, s.version)))
          .returning({ id: coupons.id })
        if (updated.length === 0) throw new ConcurrencyConflictError()
        await tx.delete(couponOffers).where(eq(couponOffers.couponId, s.id))
        await insertScope(tx, s.id, s.offerIds)
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateCouponError()
      throw error
    }
  }

  // Incremento ATÔMICO e condicional (status active + abaixo do limite) num UPDATE.
  // Com `idempotencyKey`, a operação torna-se idempotente para um pagamento:
  // reprocessamento do mesmo webhook/repito não duplica o contador.
  async incrementRedemption(code: string, idempotencyKey?: string): Promise<void> {
    const normalized = code.trim().toUpperCase()
    if (!idempotencyKey) {
      const updated = await this.db
        .update(coupons)
        .set({ timesRedeemed: sql`${coupons.timesRedeemed} + 1`, updatedAt: new Date() })
        .where(
          and(
            eq(coupons.code, normalized),
            eq(coupons.status, 'active'),
            sql`(${coupons.maxRedemptions} IS NULL OR ${coupons.timesRedeemed} < ${coupons.maxRedemptions})`,
          ),
        )
        .returning({ id: coupons.id })
      if (updated.length === 0) {
        const existing = await this.findByCode(normalized)
        if (!existing) throw new CouponNotFoundError()
        throw new CouponExhaustedError('Cupom esgotado ou inativo')
      }
      return
    }

    const found = await this.db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, normalized))
      .limit(1)
    if (found.length === 0) throw new CouponNotFoundError()
    const couponId = found[0].id

    await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(couponRedemptions)
        .values({
          id: crypto.randomUUID(),
          couponId,
          idempotencyKey,
          createdAt: new Date(),
        })
        .onConflictDoNothing({ target: [couponRedemptions.couponId, couponRedemptions.idempotencyKey] })
        .returning({ id: couponRedemptions.id })
      if (inserted.length === 0) return

      const updated = await tx
        .update(coupons)
        .set({ timesRedeemed: sql`${coupons.timesRedeemed} + 1`, updatedAt: new Date() })
        .where(
          and(
            eq(coupons.id, couponId),
            eq(coupons.status, 'active'),
            sql`(${coupons.maxRedemptions} IS NULL OR ${coupons.timesRedeemed} < ${coupons.maxRedemptions})`,
          ),
        )
        .returning({ id: coupons.id })
      if (updated.length === 0) throw new CouponExhaustedError('Cupom esgotado ou inativo')
    })

  }

  private async hydrate(row: CouponRow): Promise<CouponAggregate> {
    const scope = await this.db.select().from(couponOffers).where(eq(couponOffers.couponId, row.id))
    return CouponAggregate.restore(toSnapshot(row, scope))
  }
}

function buildFilter(query: ListQuery): SQL | undefined {
  const conditions: SQL[] = []
  if (query.status) conditions.push(eq(coupons.status, query.status as CouponRow['status']))
  if (query.q) {
    // Busca LITERAL: escapa os curingas do LIKE (ver pg-errors.escapeLike).
    const like = `%${escapeLike(query.q.trim())}%`
    const match = ilike(coupons.code, like)
    if (match) conditions.push(match)
  }
  return conditions.length > 0 ? and(...conditions) : undefined
}

function toRow(s: CouponSnapshot) {
  return {
    id: s.id,
    version: s.version,
    code: s.code,
    type: s.type,
    percentOff: s.percentOff,
    amountOffCents: s.amountOffCents,
    currency: s.currency,
    status: s.status,
    appliesToAll: s.appliesToAll,
    minPurchaseCents: s.minPurchaseCents,
    maxRedemptions: s.maxRedemptions,
    timesRedeemed: s.timesRedeemed,
    validFrom: s.validFrom,
    validUntil: s.validUntil,
    metadata: s.metadata,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

async function insertScope(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  couponId: string,
  offerIds: string[],
): Promise<void> {
  if (offerIds.length === 0) return
  await tx
    .insert(couponOffers)
    .values(offerIds.map((offerId) => ({ id: crypto.randomUUID(), couponId, offerId })))
}

function toSnapshot(row: CouponRow, scope: CouponOfferRow[]): CouponSnapshot {
  return {
    id: row.id,
    version: row.version,
    code: row.code,
    type: row.type as CouponType,
    percentOff: row.percentOff,
    amountOffCents: row.amountOffCents,
    currency: row.currency as Currency,
    status: row.status as CouponStatus,
    appliesToAll: row.appliesToAll,
    minPurchaseCents: row.minPurchaseCents,
    maxRedemptions: row.maxRedemptions,
    timesRedeemed: row.timesRedeemed,
    validFrom: row.validFrom,
    validUntil: row.validUntil,
    metadata: row.metadata ?? null,
    offerIds: scope.map((s) => s.offerId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
