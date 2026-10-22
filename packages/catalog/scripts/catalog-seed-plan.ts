import type { CreateOfferService } from '../src/application/create-offer/create-offer.service'
import type { CreateProductService } from '../src/application/create-product/create-product.service'
import { OfferAggregate, type OfferSnapshot } from '../src/domain/offer/offer.aggregate'
import { DuplicateOfferError } from '../src/domain/offer/offer.errors'
import type { OfferRepository } from '../src/domain/ports/offer-repository.port'
import type { ProductRepository } from '../src/domain/ports/product-repository.port'
import { ProductAggregate, type ProductSnapshot } from '../src/domain/product/product.aggregate'
import { DuplicateProductError } from '../src/domain/product/product.errors'
import { Sku } from '../src/domain/value-objects/sku'
import { Slug } from '../src/domain/value-objects/slug'
import {
  CATALOG_SEED_OFFERS,
  CATALOG_SEED_PRODUCTS,
  type CatalogSeedOffer,
  type CatalogSeedProduct,
} from './catalog-seed-definitions'

export type CatalogSeedMode = 'plan' | 'status' | 'apply'
export function parseCatalogSeedArgs(args: readonly string[]): CatalogSeedMode {
  if (args.length === 0) return 'plan'
  if (args.length !== 1 || !['plan', 'status', 'apply'].includes(args[0] ?? '')) {
    throw new Error('Uso: db:seed [plan|status|apply]. Force/reseed não são suportados.')
  }
  return args[0] as CatalogSeedMode
}

export interface CatalogSeedPorts {
  products: ProductRepository
  offers: OfferRepository
  findOfferByCode(code: string): Promise<OfferAggregate | null>
  createProduct: Pick<CreateProductService, 'execute'>
  createOffer: Pick<CreateOfferService, 'execute'>
}

interface Entry {
  key: string
  state: 'missing' | 'present' | 'drift' | 'blocked'
  differingFields: string[]
  reason?: 'identity-conflict' | 'dependency-drift'
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
function differences(expected: object, actual: object): string[] {
  const observed = new Map(Object.entries(actual))
  return Object.entries(expected)
    .filter(([k, v]) => canonical(v) !== canonical(observed.get(k)))
    .map(([k]) => k)
}
function productFields(s: ProductSnapshot) {
  const { id: _id, version: _version, createdAt: _created, updatedAt: _updated, ...fields } = s
  return fields
}
function offerFields(s: OfferSnapshot) {
  const { id: _id, version: _version, createdAt: _created, updatedAt: _updated, ...fields } = s
  return fields
}
async function productCommand(def: CatalogSeedProduct, ports: CatalogSeedPorts) {
  const { components, ...fields } = def
  return {
    ...fields,
    components: await Promise.all(
      (components ?? []).map(async (c, index) => ({
        componentProductId:
          (await ports.products.findBySku(c.productSku))?.id ?? `missing:${c.productSku}`,
        sortOrder: c.sortOrder ?? index,
        isPrimary: c.isPrimary ?? false,
      })),
    ),
  }
}
async function offerCommand(def: CatalogSeedOffer, ports: CatalogSeedPorts) {
  const { productSku, items, ...fields } = def
  return {
    ...fields,
    productId: (await ports.products.findBySku(productSku))?.id ?? `missing:${productSku}`,
    items: await Promise.all(
      (items ?? []).map(async (item, index) => ({
        productId:
          (await ports.products.findBySku(item.productSku))?.id ?? `missing:${item.productSku}`,
        sortOrder: item.sortOrder ?? index,
      })),
    ),
  }
}

async function inspectProduct(def: CatalogSeedProduct, ports: CatalogSeedPorts): Promise<Entry> {
  const bySku = await ports.products.findBySku(def.sku)
  const bySlug = await ports.products.findBySlug(def.slug)
  if (
    (bySku && bySku.slug !== def.slug) ||
    (bySlug && bySlug.sku !== def.sku) ||
    (bySku && bySlug && bySku.id !== bySlug.id)
  ) {
    return {
      key: def.sku,
      state: 'blocked',
      reason: 'identity-conflict',
      differingFields: ['sku', 'slug'],
    }
  }
  if (!bySku) return { key: def.sku, state: 'missing', differingFields: [] }
  const command = await productCommand(def, ports)
  const expected = ProductAggregate.create({
    ...command,
    id: bySku.id,
    sku: Sku.create(def.sku),
    slug: Slug.create(def.slug),
  })
  const differingFields = differences(
    productFields(expected.toSnapshot()),
    productFields(bySku.toSnapshot()),
  )
  return { key: def.sku, state: differingFields.length ? 'drift' : 'present', differingFields }
}
async function inspectOffer(def: CatalogSeedOffer, ports: CatalogSeedPorts): Promise<Entry> {
  const bySlug = await ports.offers.findBySlug(def.slug)
  const byCode = await ports.findOfferByCode(def.code)
  if (
    (bySlug && bySlug.code !== def.code) ||
    (byCode && byCode.slug !== def.slug) ||
    (bySlug && byCode && bySlug.id !== byCode.id)
  ) {
    return {
      key: def.slug,
      state: 'blocked',
      reason: 'identity-conflict',
      differingFields: ['code', 'slug'],
    }
  }
  if (!bySlug) return { key: def.slug, state: 'missing', differingFields: [] }
  const command = await offerCommand(def, ports)
  const expected = OfferAggregate.create({
    ...command,
    id: bySlug.id,
    code: Sku.create(def.code),
    slug: Slug.create(def.slug),
  })
  const differingFields = differences(
    offerFields(expected.toSnapshot()),
    offerFields(bySlug.toSnapshot()),
  )
  return { key: def.slug, state: differingFields.length ? 'drift' : 'present', differingFields }
}

/** Never use a modified product to silently create a new commercial promise. */
async function dependenciesSafe(
  skus: readonly string[],
  ports: CatalogSeedPorts,
  allowMissing: boolean,
): Promise<boolean> {
  for (const sku of skus) {
    const definition = CATALOG_SEED_PRODUCTS.find((product) => product.sku === sku)
    if (!definition) return false
    const state = await inspectProduct(definition, ports)
    if (state.state !== 'present' && !(allowMissing && state.state === 'missing')) return false
    if (
      !(await dependenciesSafe(
        (definition.components ?? []).map((c) => c.productSku),
        ports,
        allowMissing,
      ))
    )
      return false
  }
  return true
}

export async function planCatalogSeed(ports: CatalogSeedPorts) {
  const products = []
  for (const definition of CATALOG_SEED_PRODUCTS) {
    let entry = await inspectProduct(definition, ports)
    if (
      entry.state === 'missing' &&
      !(await dependenciesSafe(
        (definition.components ?? []).map((c) => c.productSku),
        ports,
        true,
      ))
    ) {
      entry = { ...entry, state: 'blocked', reason: 'dependency-drift' }
    }
    products.push({ ...entry, definition })
  }
  const offers = []
  for (const definition of CATALOG_SEED_OFFERS) {
    let entry = await inspectOffer(definition, ports)
    if (
      entry.state === 'missing' &&
      !(await dependenciesSafe(
        [definition.productSku, ...(definition.items ?? []).map((i) => i.productSku)],
        ports,
        true,
      ))
    ) {
      entry = { ...entry, state: 'blocked', reason: 'dependency-drift' }
    }
    offers.push({ ...entry, definition })
  }
  return { products, offers, courseContentVerified: false as const }
}

export async function runCatalogSeed(mode: CatalogSeedMode, ports: CatalogSeedPorts) {
  const before = await planCatalogSeed(ports)
  const created: { kind: 'product' | 'offer'; key: string }[] = []
  const failures: {
    kind: 'product' | 'offer'
    key: string
    reason: 'identity-conflict' | 'create-failed'
  }[] = []
  if (
    mode === 'apply' &&
    ![...before.products, ...before.offers].some((entry) => entry.state === 'blocked')
  ) {
    for (const definition of CATALOG_SEED_PRODUCTS) {
      const current = await inspectProduct(definition, ports)
      if (current.state !== 'missing') continue
      if (
        !(await dependenciesSafe(
          (definition.components ?? []).map((c) => c.productSku),
          ports,
          false,
        ))
      )
        continue
      try {
        await ports.createProduct.execute(await productCommand(definition, ports))
        created.push({ kind: 'product', key: definition.sku })
      } catch (error) {
        if (
          error instanceof DuplicateProductError &&
          (await inspectProduct(definition, ports)).state !== 'missing'
        )
          continue
        failures.push({
          kind: 'product',
          key: definition.sku,
          reason: error instanceof DuplicateProductError ? 'identity-conflict' : 'create-failed',
        })
        break
      }
    }
    if (failures.length === 0)
      for (const definition of CATALOG_SEED_OFFERS) {
        const current = await inspectOffer(definition, ports)
        if (current.state !== 'missing') continue
        if (
          !(await dependenciesSafe(
            [definition.productSku, ...(definition.items ?? []).map((i) => i.productSku)],
            ports,
            false,
          ))
        )
          continue
        try {
          await ports.createOffer.execute(await offerCommand(definition, ports))
          created.push({ kind: 'offer', key: definition.slug })
        } catch (error) {
          if (
            error instanceof DuplicateOfferError &&
            (await inspectOffer(definition, ports)).state !== 'missing'
          )
            continue
          failures.push({
            kind: 'offer',
            key: definition.slug,
            reason: error instanceof DuplicateOfferError ? 'identity-conflict' : 'create-failed',
          })
          break
        }
      }
  }
  const after = mode === 'apply' ? await planCatalogSeed(ports) : before
  const incomplete =
    failures.length > 0 ||
    [...after.products, ...after.offers].some(
      (entry) => entry.state === 'blocked' || entry.state === 'missing',
    )
  return {
    schemaVersion: 1,
    domain: 'catalog',
    mode,
    created,
    failures,
    before,
    after,
    outcome: mode !== 'apply' ? 'read-only' : incomplete ? 'incomplete' : 'complete',
  }
}
