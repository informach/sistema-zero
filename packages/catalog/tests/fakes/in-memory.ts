import { CouponAggregate, type CouponSnapshot } from '../../src/domain/coupon/coupon.aggregate'
import {
  CouponExhaustedError,
  CouponNotFoundError,
  DuplicateCouponError,
} from '../../src/domain/coupon/coupon.errors'
import { OfferAggregate, type OfferSnapshot } from '../../src/domain/offer/offer.aggregate'
import { DuplicateOfferError } from '../../src/domain/offer/offer.errors'
import type { CouponRepository } from '../../src/domain/ports/coupon-repository.port'
import type { ListQuery, Page } from '../../src/domain/ports/list'
import type { OfferRepository } from '../../src/domain/ports/offer-repository.port'
import type { ProductRepository } from '../../src/domain/ports/product-repository.port'
import { ProductAggregate, type ProductSnapshot } from '../../src/domain/product/product.aggregate'
import { DuplicateProductError } from '../../src/domain/product/product.errors'
import type { EntitlementNode } from '../../src/domain/services/resolve-entitlements'
import { ConcurrencyConflictError } from '../../src/domain/shared/concurrency.error'

/** Repositório de produtos em memória (testes). Espelha a semântica do Drizzle. */
export class InMemoryProductRepository implements ProductRepository {
  private readonly store = new Map<string, ProductSnapshot>()

  async findById(id: string): Promise<ProductAggregate | null> {
    const s = this.store.get(id)
    return s ? ProductAggregate.restore(clone(s)) : null
  }

  async findBySlug(slug: string): Promise<ProductAggregate | null> {
    const normalized = slug.trim().toLowerCase()
    for (const s of this.store.values()) {
      if (s.slug === normalized) return ProductAggregate.restore(clone(s))
    }
    return null
  }

  async findBySku(sku: string): Promise<ProductAggregate | null> {
    const normalized = sku.trim().toLowerCase()
    for (const s of this.store.values()) {
      if (s.sku === normalized) return ProductAggregate.restore(clone(s))
    }
    return null
  }

  async list(query: ListQuery): Promise<Page<ProductAggregate>> {
    const all = [...this.store.values()]
      .filter((s) => !query.status || s.status === query.status)
      .filter((s) => matchQ(query.q, s.name, s.slug, s.sku))
      .sort(byCreatedAtDesc)
    const items = all
      .slice(query.offset, query.offset + query.limit)
      .map((s) => ProductAggregate.restore(clone(s)))
    return { items, total: all.length }
  }

  async findNodesByIds(ids: string[]): Promise<EntitlementNode[]> {
    const set = new Set(ids)
    const nodes: EntitlementNode[] = []
    for (const s of this.store.values()) {
      if (!set.has(s.id)) continue
      nodes.push({
        productId: s.id,
        sku: s.sku,
        name: s.name,
        kind: s.kind,
        fulfillment: s.fulfillment,
        components: s.components.map((c) => ({
          productId: c.componentProductId,
          sortOrder: c.sortOrder,
          isPrimary: c.isPrimary,
        })),
      })
    }
    return nodes
  }

  async create(product: ProductAggregate): Promise<void> {
    const s = product.toSnapshot()
    for (const existing of this.store.values()) {
      if (existing.sku === s.sku || existing.slug === s.slug) throw new DuplicateProductError()
    }
    this.store.set(s.id, clone(s))
  }

  async update(product: ProductAggregate): Promise<void> {
    const s = product.toSnapshot()
    const current = this.store.get(s.id)
    if (!current) throw new ConcurrencyConflictError()
    if (current.version !== s.version) throw new ConcurrencyConflictError()
    for (const existing of this.store.values()) {
      if (existing.id === s.id) continue
      if (existing.sku === s.sku || existing.slug === s.slug) throw new DuplicateProductError()
    }
    this.store.set(s.id, clone({ ...s, version: s.version + 1 }))
  }
}

/** Repositório de ofertas em memória (testes). */
export class InMemoryOfferRepository implements OfferRepository {
  private readonly store = new Map<string, OfferSnapshot>()

  async findById(id: string): Promise<OfferAggregate | null> {
    const s = this.store.get(id)
    return s ? OfferAggregate.restore(clone(s)) : null
  }

  async findBySlug(slug: string): Promise<OfferAggregate | null> {
    const normalized = slug.trim().toLowerCase()
    for (const s of this.store.values()) {
      if (s.slug === normalized) return OfferAggregate.restore(clone(s))
    }
    return null
  }

  async findByIds(ids: string[]): Promise<OfferAggregate[]> {
    const set = new Set(ids)
    const out: OfferAggregate[] = []
    for (const s of this.store.values()) {
      if (set.has(s.id)) out.push(OfferAggregate.restore(clone(s)))
    }
    return out
  }

  async list(query: ListQuery & { productId?: string }): Promise<Page<OfferAggregate>> {
    const all = [...this.store.values()]
      .filter((s) => !query.status || s.status === query.status)
      .filter((s) => !query.productId || s.productId === query.productId)
      .filter((s) => matchQ(query.q, s.name, s.slug, s.code))
      .sort(byCreatedAtDesc)
    const items = all
      .slice(query.offset, query.offset + query.limit)
      .map((s) => OfferAggregate.restore(clone(s)))
    return { items, total: all.length }
  }

  async create(offer: OfferAggregate): Promise<void> {
    const s = offer.toSnapshot()
    for (const existing of this.store.values()) {
      if (existing.code === s.code || existing.slug === s.slug) throw new DuplicateOfferError()
    }
    this.store.set(s.id, clone(s))
  }

  async update(offer: OfferAggregate): Promise<void> {
    const s = offer.toSnapshot()
    const current = this.store.get(s.id)
    if (!current) throw new ConcurrencyConflictError()
    if (current.version !== s.version) throw new ConcurrencyConflictError()
    for (const existing of this.store.values()) {
      if (existing.id === s.id) continue
      if (existing.code === s.code || existing.slug === s.slug) throw new DuplicateOfferError()
    }
    this.store.set(s.id, clone({ ...s, version: s.version + 1 }))
  }
}

/** Repositório de cupons em memória (testes). */
export class InMemoryCouponRepository implements CouponRepository {
  private readonly store = new Map<string, CouponSnapshot>()
  private readonly redemptions = new Map<string, Set<string>>()

  async findById(id: string): Promise<CouponAggregate | null> {
    const s = this.store.get(id)
    return s ? CouponAggregate.restore(clone(s)) : null
  }

  async findByCode(code: string): Promise<CouponAggregate | null> {
    const normalized = code.trim().toUpperCase()
    for (const s of this.store.values()) {
      if (s.code === normalized) return CouponAggregate.restore(clone(s))
    }
    return null
  }

  async list(query: ListQuery): Promise<Page<CouponAggregate>> {
    const all = [...this.store.values()]
      .filter((s) => !query.status || s.status === query.status)
      .filter((s) => matchQ(query.q, s.code))
      .sort(byCreatedAtDesc)
    const items = all
      .slice(query.offset, query.offset + query.limit)
      .map((s) => CouponAggregate.restore(clone(s)))
    return { items, total: all.length }
  }

  async create(coupon: CouponAggregate): Promise<void> {
    const s = coupon.toSnapshot()
    for (const existing of this.store.values()) {
      if (existing.code === s.code) throw new DuplicateCouponError()
    }
    this.store.set(s.id, clone(s))
  }

  async update(coupon: CouponAggregate): Promise<void> {
    const s = coupon.toSnapshot()
    const current = this.store.get(s.id)
    if (!current) throw new ConcurrencyConflictError()
    if (current.version !== s.version) throw new ConcurrencyConflictError()
    this.store.set(s.id, clone({ ...s, version: s.version + 1 }))
  }

  async incrementRedemption(code: string, idempotencyKey?: string): Promise<void> {
    const normalized = code.trim().toUpperCase()
    for (const s of this.store.values()) {
      if (s.code !== normalized) continue
      if (idempotencyKey && (this.redemptions.get(s.id)?.has(idempotencyKey) ?? false)) {
        return
      }

      if (s.status !== 'active') throw new CouponExhaustedError('Cupom esgotado ou inativo')
      if (s.maxRedemptions !== null && s.timesRedeemed >= s.maxRedemptions) {
        throw new CouponExhaustedError()
      }

      if (idempotencyKey) {
        const seen = this.redemptions.get(s.id) ?? new Set<string>()
        seen.add(idempotencyKey)
        this.redemptions.set(s.id, seen)
      }
      this.store.set(s.id, clone({ ...s, timesRedeemed: s.timesRedeemed + 1 }))
      return
    }
    throw new CouponNotFoundError()
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function matchQ(q: string | undefined, ...fields: string[]): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  return fields.some((f) => f.toLowerCase().includes(needle))
}

function byCreatedAtDesc(a: { createdAt: Date }, b: { createdAt: Date }): number {
  return b.createdAt.getTime() - a.createdAt.getTime()
}
