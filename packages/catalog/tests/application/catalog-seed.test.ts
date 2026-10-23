import { describe, expect, test } from 'bun:test'
import { createLogger } from '@sistemazero/core/logging'
import { CATALOG_SEED_OFFERS, CATALOG_SEED_PRODUCTS } from '../../scripts/catalog-seed-definitions'
import { parseCatalogSeedArgs, runCatalogSeed } from '../../scripts/catalog-seed-plan'
import { CreateOfferService } from '../../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../../src/application/create-product/create-product.service'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { ProductAggregate } from '../../src/domain/product/product.aggregate'
import { Sku } from '../../src/domain/value-objects/sku'
import { Slug } from '../../src/domain/value-objects/slug'
import { InMemoryOfferRepository, InMemoryProductRepository } from '../fakes/in-memory'

function fixture() {
  const products = new InMemoryProductRepository()
  const offers = new InMemoryOfferRepository()
  const logger = createLogger({ level: 'error' })
  return {
    products,
    offers,
    createProduct: new CreateProductService(products, logger),
    createOffer: new CreateOfferService(
      offers,
      products,
      new ResolveOfferEntitlementsService(products),
      logger,
    ),
    findOfferByCode: async (code: string) =>
      (await offers.list({ limit: 1000, offset: 0 })).items.find((offer) => offer.code === code) ??
      null,
  }
}

describe('explicit, non-destructive Catalog seed', () => {
  test('strict arguments default to planning and never accept force/reseed', () => {
    expect(parseCatalogSeedArgs([])).toBe('plan')
    for (const mode of ['plan', 'status', 'apply'] as const)
      expect(parseCatalogSeedArgs([mode])).toBe(mode)
    for (const args of [
      ['--apply'],
      ['apply', '--force'],
      ['--force'],
      ['reseed'],
      ['status', 'apply'],
    ])
      expect(() => parseCatalogSeedArgs(args)).toThrow()
  })
  test('plan/status expose active offers and references without any write', async () => {
    const ports = fixture()
    for (const mode of ['plan', 'status'] as const) {
      const report = await runCatalogSeed(mode, ports)
      expect(report.created).toEqual([])
      expect(report.before.products).toHaveLength(19)
      expect(report.before.offers).toHaveLength(12)
      expect(report.before.offers.every((o) => o.state === 'missing')).toBe(true)
      expect(report.before.courseContentVerified).toBe(false)
    }
    expect((await ports.products.list({ limit: 100, offset: 0 })).total).toBe(0)
    expect((await ports.offers.list({ limit: 100, offset: 0 })).total).toBe(0)
    expect(
      CATALOG_SEED_OFFERS.find((o) => o.slug === 'comunidade-dos-criadores-adulto-anual'),
    ).toMatchObject({
      priceCents: 79700,
      compareAtPriceCents: 116400,
      status: 'active',
      billingIntervalMonths: 12,
    })
    expect(
      CATALOG_SEED_OFFERS.find((o) => o.slug === 'desafio-primeiro-jogo-30-dias')?.status,
    ).toBe('draft')
    expect(
      CATALOG_SEED_OFFERS.find((o) => o.slug === 'desafio-primeiro-jogo-adulto-30-dias'),
    ).toMatchObject({
      priceCents: 6700,
      status: 'active',
      accessMode: 'fixed',
      accessDurationValue: 30,
      items: [{ productSku: 'adult-mural-dos-criadores' }],
    })
  })
  test('applies real domain validation, resolves seven bundle deliveries and is idempotent', async () => {
    const ports = fixture()
    const first = await runCatalogSeed('apply', ports)
    expect(first.outcome).toBe('complete')
    expect(first.created).toHaveLength(31)
    expect(first.after.products.every((p) => p.state === 'present')).toBe(true)
    expect(first.after.offers.every((o) => o.state === 'present')).toBe(true)
    const annual = await ports.offers.findBySlug('comunidade-dos-criadores-adulto-anual')
    if (!annual) throw new Error('missing offer')
    expect(await new ResolveOfferEntitlementsService(ports.products).execute(annual)).toHaveLength(
      7,
    )
    expect((await runCatalogSeed('apply', ports)).created).toEqual([])
  })
  test('preserves Admin kind, bundle and price changes and reports drift', async () => {
    const ports = fixture()
    await runCatalogSeed('apply', ports)
    const studio = await ports.products.findBySku('estudio-completo')
    const offer = await ports.offers.findBySlug('estudio-completo')
    const bundle = await ports.products.findBySku('comunidade-dos-criadores')
    if (!studio || !offer || !bundle) throw new Error('missing fixture')
    studio.updateDetails({ kind: 'community', name: 'Autoria Admin' })
    await ports.products.update(studio)
    offer.updateDetails({ priceCents: 12345 })
    await ports.offers.update(offer)
    bundle.setComponents(bundle.components.filter((c) => c.componentProductId !== studio.id))
    await ports.products.update(bundle)
    const snapshot = async () =>
      JSON.stringify({
        products: await ports.products.list({ limit: 100, offset: 0 }),
        offers: await ports.offers.list({ limit: 100, offset: 0 }),
      })
    const before = await snapshot()
    const result = await runCatalogSeed('apply', ports)
    expect(result.created).toEqual([])
    expect(
      result.after.products.find((p) => p.key === 'estudio-completo')?.differingFields,
    ).toContain('kind')
    expect(
      result.after.products.find((p) => p.key === 'comunidade-dos-criadores')?.differingFields,
    ).toContain('components')
    expect(
      result.after.offers.find((o) => o.key === 'estudio-completo')?.differingFields,
    ).toContain('priceCents')
    expect(await snapshot()).toBe(before)
  })
  test('identity collision refuses writes', async () => {
    const ports = fixture()
    await ports.products.create(
      ProductAggregate.create({
        id: crypto.randomUUID(),
        sku: Sku.create('admin-custom'),
        slug: Slug.create('estudio-completo'),
        name: 'Existing Admin',
      }),
    )
    const result = await runCatalogSeed('apply', ports)
    expect(result.outcome).toBe('incomplete')
    expect(result.created).toEqual([])
    expect(result.before.products.find((p) => p.key === 'estudio-completo')).toMatchObject({
      state: 'blocked',
      reason: 'identity-conflict',
    })
    expect((await ports.products.list({ limit: 100, offset: 0 })).total).toBe(1)
  })
  test('concurrent insert is preserved and reported without update', async () => {
    const ports = fixture()
    const execute = ports.createProduct.execute.bind(ports.createProduct)
    let raced = false
    ports.createProduct.execute = async (command) => {
      if (!raced) {
        raced = true
        await execute({ ...command, name: 'Created concurrently by Admin' })
      }
      return execute(command)
    }
    const result = await runCatalogSeed('apply', ports)
    expect(result.after.products[0]?.state).toBe('drift')
    expect(result.after.offers[0]?.state).toBe('blocked')
    expect((await ports.products.findBySku(CATALOG_SEED_PRODUCTS[0]?.sku ?? ''))?.name).toBe(
      'Created concurrently by Admin',
    )
    expect(result.outcome).toBe('incomplete')
  })
  test('partial failure leaks no driver detail and can resume missing records', async () => {
    const ports = fixture()
    const execute = ports.createProduct.execute.bind(ports.createProduct)
    let calls = 0
    ports.createProduct.execute = async (command) => {
      if (++calls === 2) throw new Error('postgres://secret@private-host')
      return execute(command)
    }
    const result = await runCatalogSeed('apply', ports)
    expect(result.outcome).toBe('incomplete')
    expect(result.created).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain('secret')
    ports.createProduct.execute = execute
    const resumed = await runCatalogSeed('apply', ports)
    expect(resumed.created).toHaveLength(30)
    expect(resumed.outcome).toBe('complete')
  })
})
