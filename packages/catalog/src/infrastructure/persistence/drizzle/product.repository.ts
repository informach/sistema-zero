import { and, count, desc, eq, ilike, inArray, or, type SQL } from 'drizzle-orm'
import type { ListQuery, Page } from '../../../domain/ports/list'
import type { ProductRepository } from '../../../domain/ports/product-repository.port'
import {
  ProductAggregate,
  type ProductComponent,
  type ProductSnapshot,
} from '../../../domain/product/product.aggregate'
import { DuplicateProductError } from '../../../domain/product/product.errors'
import type { EntitlementNode } from '../../../domain/services/resolve-entitlements'
import { ConcurrencyConflictError } from '../../../domain/shared/concurrency.error'
import type { Currency } from '../../../domain/value-objects/money'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { productComponents, products } from './schema'

type ProductRow = typeof products.$inferSelect
type ComponentRow = typeof productComponents.$inferSelect

/** Repositório de produtos (Drizzle/Postgres). Produto + componentes. */
export class DrizzleProductRepository implements ProductRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<ProductAggregate | null> {
    const [row] = await this.db.select().from(products).where(eq(products.id, id)).limit(1)
    return row ? this.hydrate(row) : null
  }

  async findBySlug(slug: string): Promise<ProductAggregate | null> {
    const normalized = slug.trim().toLowerCase()
    const [row] = await this.db
      .select()
      .from(products)
      .where(eq(products.slug, normalized))
      .limit(1)
    return row ? this.hydrate(row) : null
  }

  async findBySku(sku: string): Promise<ProductAggregate | null> {
    const normalized = sku.trim().toLowerCase()
    const [row] = await this.db.select().from(products).where(eq(products.sku, normalized)).limit(1)
    return row ? this.hydrate(row) : null
  }

  async list(query: ListQuery): Promise<Page<ProductAggregate>> {
    const where = buildFilter(query)
    const countRows = await this.db.select({ value: count() }).from(products).where(where)
    const total = countRows[0]?.value ?? 0
    if (total === 0) return { items: [], total: 0 }
    const rows = await this.db
      .select()
      .from(products)
      .where(where)
      .orderBy(desc(products.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    if (rows.length === 0) return { items: [], total }
    const componentRows = await this.db
      .select()
      .from(productComponents)
      .where(
        inArray(
          productComponents.productId,
          rows.map((r) => r.id),
        ),
      )
    const byProduct = groupComponents(componentRows)
    const items = rows.map((row) =>
      ProductAggregate.restore(toSnapshot(row, byProduct.get(row.id) ?? [])),
    )
    return { items, total }
  }

  async findNodesByIds(ids: string[]): Promise<EntitlementNode[]> {
    if (ids.length === 0) return []
    const rows = await this.db.select().from(products).where(inArray(products.id, ids))
    if (rows.length === 0) return []
    const componentRows = await this.db
      .select()
      .from(productComponents)
      .where(
        inArray(
          productComponents.productId,
          rows.map((r) => r.id),
        ),
      )
    const byProduct = groupComponents(componentRows)
    return rows.map((row) => ({
      productId: row.id,
      sku: row.sku,
      name: row.name,
      kind: row.kind,
      status: row.status,
      fulfillment: row.fulfillment ?? null,
      components: (byProduct.get(row.id) ?? []).map((c) => ({
        productId: c.componentProductId,
        sortOrder: c.sortOrder,
        isPrimary: c.isPrimary,
      })),
    }))
  }

  async create(product: ProductAggregate): Promise<void> {
    const s = product.toSnapshot()
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(products).values(toRow(s))
        await insertComponents(tx, s.id, s.components)
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateProductError()
      throw error
    }
  }

  async update(product: ProductAggregate): Promise<void> {
    const s = product.toSnapshot()
    try {
      await this.db.transaction(async (tx) => {
        const updated = await tx
          .update(products)
          .set({
            version: s.version + 1,
            sku: s.sku,
            slug: s.slug,
            name: s.name,
            kind: s.kind,
            description: s.description,
            status: s.status,
            sellable: s.sellable,
            currency: s.currency,
            fulfillment: s.fulfillment,
            metadata: s.metadata,
            updatedAt: s.updatedAt,
          })
          .where(and(eq(products.id, s.id), eq(products.version, s.version)))
          .returning({ id: products.id })
        if (updated.length === 0) throw new ConcurrencyConflictError()
        await tx.delete(productComponents).where(eq(productComponents.productId, s.id))
        await insertComponents(tx, s.id, s.components)
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new DuplicateProductError()
      throw error
    }
  }

  private async hydrate(row: ProductRow): Promise<ProductAggregate> {
    const componentRows = await this.db
      .select()
      .from(productComponents)
      .where(eq(productComponents.productId, row.id))
    return ProductAggregate.restore(toSnapshot(row, componentRows))
  }
}

function buildFilter(query: ListQuery): SQL | undefined {
  const conditions: SQL[] = []
  if (query.status) conditions.push(eq(products.status, query.status as ProductRow['status']))
  if (query.q) {
    // Busca LITERAL: escapa os curingas do LIKE (ver pg-errors.escapeLike).
    const like = `%${escapeLike(query.q.trim())}%`
    const match = or(
      ilike(products.name, like),
      ilike(products.slug, like),
      ilike(products.sku, like),
    )
    if (match) conditions.push(match)
  }
  return conditions.length > 0 ? and(...conditions) : undefined
}

function toRow(s: ProductSnapshot) {
  return {
    id: s.id,
    version: s.version,
    sku: s.sku,
    slug: s.slug,
    name: s.name,
    kind: s.kind,
    description: s.description,
    status: s.status,
    sellable: s.sellable,
    currency: s.currency,
    fulfillment: s.fulfillment,
    metadata: s.metadata,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

async function insertComponents(
  tx: Parameters<Parameters<Database['transaction']>[0]>[0],
  productId: string,
  components: ProductComponent[],
): Promise<void> {
  if (components.length === 0) return
  await tx.insert(productComponents).values(
    components.map((c) => ({
      id: crypto.randomUUID(),
      productId,
      componentProductId: c.componentProductId,
      sortOrder: c.sortOrder,
      isPrimary: c.isPrimary,
    })),
  )
}

function groupComponents(rows: ComponentRow[]): Map<string, ComponentRow[]> {
  const map = new Map<string, ComponentRow[]>()
  for (const row of rows) {
    const list = map.get(row.productId)
    if (list) list.push(row)
    else map.set(row.productId, [row])
  }
  return map
}

function toSnapshot(row: ProductRow, componentRows: ComponentRow[]): ProductSnapshot {
  return {
    id: row.id,
    version: row.version,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    description: row.description,
    status: row.status,
    sellable: row.sellable,
    currency: row.currency as Currency,
    fulfillment: row.fulfillment ?? null,
    metadata: row.metadata ?? null,
    components: componentRows
      .map((c) => ({
        componentProductId: c.componentProductId,
        sortOrder: c.sortOrder,
        isPrimary: c.isPrimary,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
