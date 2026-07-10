import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'
import {
  OfferAggregate,
  type OfferItem,
  type OfferSnapshot,
} from '../../../domain/offer/offer.aggregate'
import { DuplicateOfferError } from '../../../domain/offer/offer.errors'
import type { OfferStatus } from '../../../domain/offer/offer.status'
import type { PricingMode } from '../../../domain/offer/pricing-mode'
import type { ListQuery, Page } from '../../../domain/ports/list'
import type { OfferRepository } from '../../../domain/ports/offer-repository.port'
import { ConcurrencyConflictError } from '../../../domain/shared/concurrency.error'
import type { Currency } from '../../../domain/value-objects/money'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { offerItems, offers } from './schema'

type OfferRow = typeof offers.$inferSelect
type ItemRow = typeof offerItems.$inferSelect

/** Repositório de ofertas (Drizzle/Postgres). Oferta + itens adicionais. */
export class DrizzleOfferRepository implements OfferRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<OfferAggregate | null> {
    const [row] = await this.db.select().from(offers).where(eq(offers.id, id)).limit(1)
    return row ? this.hydrate(row) : null
  }

  async findBySlug(slug: string): Promise<OfferAggregate | null> {
    const normalized = slug.trim().toLowerCase()
    const [row] = await this.db.select().from(offers).where(eq(offers.slug, normalized)).limit(1)
    return row ? this.hydrate(row) : null
  }

  /** Batch por id: 2 queries (ofertas + itens), evita N+1 na validação de escopo. */
  async findByIds(ids: string[]): Promise<OfferAggregate[]> {
    if (ids.length === 0) return []
    const rows = await this.db.select().from(offers).where(inArray(offers.id, ids))
    if (rows.length === 0) return []
    const itemRows = await this.db
      .select()
      .from(offerItems)
      .where(
        inArray(
          offerItems.offerId,
          rows.map((r) => r.id),
        ),
      )
    const byOffer = new Map<string, ItemRow[]>()
    for (const it of itemRows) {
      const list = byOffer.get(it.offerId)
      if (list) list.push(it)
      else byOffer.set(it.offerId, [it])
    }
    return rows.map((row) => OfferAggregate.restore(toSnapshot(row, byOffer.get(row.id) ?? [])))
  }

  async list(query: ListQuery & { productId?: string }): Promise<Page<OfferAggregate>> {
    const where = buildFilter(query)
    const countRows = await this.db.select({ value: count() }).from(offers).where(where)
    const total = countRows[0]?.value ?? 0
    if (total === 0) return { items: [], total: 0 }
    const rows = await this.db
      .select()
      .from(offers)
      .where(where)
      .orderBy(desc(offers.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    if (rows.length === 0) return { items: [], total }
    const itemRows = await this.db
      .select()
      .from(offerItems)
      .where(
        inArray(
          offerItems.offerId,
          rows.map((r) => r.id),
        ),
      )
    const byOffer = new Map<string, ItemRow[]>()
    for (const it of itemRows) {
      const list = byOffer.get(it.offerId)
      if (list) list.push(it)
      else byOffer.set(it.offerId, [it])
    }
    const items = rows.map((row) =>
      OfferAggregate.restore(toSnapshot(row, byOffer.get(row.id) ?? [])),
    )
    return { items, total }
  }

  async create(offer: OfferAggregate): Promise<void> {
    const s = offer.toSnapshot()
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(offers).values(toRow(s))
        await insertItems(tx, s.id, s.items)
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateOfferError()
      throw error
    }
  }

  async update(offer: OfferAggregate): Promise<void> {
    const s = offer.toSnapshot()
    try {
      await this.db.transaction(async (tx) => {
        const updated = await tx
          .update(offers)
          .set({
            version: s.version + 1,
            productId: s.productId,
            code: s.code,
            slug: s.slug,
            name: s.name,
            status: s.status,
            priceCents: s.priceCents,
            compareAtPriceCents: s.compareAtPriceCents,
            currency: s.currency,
            pricingMode: s.pricingMode,
            billingIntervalMonths: s.billingIntervalMonths,
            installmentsMax: s.installmentsMax,
            trialDays: s.trialDays,
            guaranteeDays: s.guaranteeDays,
            availableFrom: s.availableFrom,
            availableUntil: s.availableUntil,
            content: s.content,
            metadata: s.metadata,
            updatedAt: s.updatedAt,
          })
          .where(and(eq(offers.id, s.id), eq(offers.version, s.version)))
          .returning({ id: offers.id })
        if (updated.length === 0) throw new ConcurrencyConflictError()
        await tx.delete(offerItems).where(eq(offerItems.offerId, s.id))
        await insertItems(tx, s.id, s.items)
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateOfferError()
      throw error
    }
  }

  private async hydrate(row: OfferRow): Promise<OfferAggregate> {
    const itemRows = await this.db.select().from(offerItems).where(eq(offerItems.offerId, row.id))
    return OfferAggregate.restore(toSnapshot(row, itemRows))
  }
}

function buildFilter(query: ListQuery & { productId?: string }): SQL | undefined {
  const conditions: SQL[] = []
  if (query.status) conditions.push(eq(offers.status, query.status as OfferRow['status']))
  if (query.productId) conditions.push(eq(offers.productId, query.productId))
  if (query.q) {
    // Busca LITERAL: escapa os curingas do LIKE (ver pg-errors.escapeLike).
    const like = `%${escapeLike(query.q.trim())}%`
    const match = or(ilike(offers.name, like), ilike(offers.slug, like), ilike(offers.code, like))
    if (match) conditions.push(match)
  }
  return conditions.length > 0 ? and(...conditions) : undefined
}

function toRow(s: OfferSnapshot) {
  return {
    id: s.id,
    version: s.version,
    productId: s.productId,
    code: s.code,
    slug: s.slug,
    name: s.name,
    status: s.status,
    priceCents: s.priceCents,
    compareAtPriceCents: s.compareAtPriceCents,
    currency: s.currency,
    pricingMode: s.pricingMode,
    billingIntervalMonths: s.billingIntervalMonths,
    installmentsMax: s.installmentsMax,
    trialDays: s.trialDays,
    guaranteeDays: s.guaranteeDays,
    availableFrom: s.availableFrom,
    availableUntil: s.availableUntil,
    content: s.content,
    metadata: s.metadata,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

async function insertItems(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  offerId: string,
  items: OfferItem[],
): Promise<void> {
  if (items.length === 0) return
  await tx.insert(offerItems).values(
    items.map((item) => ({
      id: crypto.randomUUID(),
      offerId,
      productId: item.productId,
      sortOrder: item.sortOrder,
    })),
  )
}

function toSnapshot(row: OfferRow, itemRows: ItemRow[]): OfferSnapshot {
  return {
    id: row.id,
    version: row.version,
    productId: row.productId,
    code: row.code,
    slug: row.slug,
    name: row.name,
    status: row.status as OfferStatus,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    currency: row.currency as Currency,
    pricingMode: row.pricingMode as PricingMode,
    billingIntervalMonths: row.billingIntervalMonths,
    installmentsMax: row.installmentsMax,
    trialDays: row.trialDays,
    guaranteeDays: row.guaranteeDays,
    availableFrom: row.availableFrom,
    availableUntil: row.availableUntil,
    content: row.content ?? null,
    metadata: row.metadata ?? null,
    items: itemRows
      .map((item) => ({ productId: item.productId, sortOrder: item.sortOrder }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
