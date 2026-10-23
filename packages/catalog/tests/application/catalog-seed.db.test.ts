import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import { createLogger } from '@sistemazero/core/logging'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { runCatalogSeed } from '../../scripts/catalog-seed-plan'
import { CreateOfferService } from '../../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../../src/application/create-product/create-product.service'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleOfferRepository } from '../../src/infrastructure/persistence/drizzle/offer.repository'
import { DrizzleProductRepository } from '../../src/infrastructure/persistence/drizzle/product.repository'
import {
  offers as offerRows,
  products as productRows,
} from '../../src/infrastructure/persistence/drizzle/schema'

const url = process.env.CATALOG_SEED_TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(target.hostname) ||
    target.port !== '55449' ||
    target.pathname !== '/catalog_seed_review'
  )
    throw new Error('Catalog seed test requires its isolated local database')
}
describe.skipIf(!url)('Catalog seed PostgreSQL adapter', () => {
  const connection = url ? createDbConnection(url, { max: 2 }) : null
  beforeAll(async () => {
    if (!connection) throw new Error('Missing test connection')
    await migrate(connection.db, {
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
      ),
      migrationsTable: 'catalog_migrations',
    })
  })
  afterAll(async () => {
    await connection?.close()
  })
  test('real repositories plan without writes, create 18/11 once and preserve existing commercial changes', async () => {
    if (!connection) throw new Error('Missing test connection')
    const db = connection.db
    const products = new DrizzleProductRepository(db)
    const offers = new DrizzleOfferRepository(db)
    const logger = createLogger({ level: 'error', pretty: false })
    const ports = {
      products,
      offers,
      createProduct: new CreateProductService(products, logger),
      createOffer: new CreateOfferService(
        offers,
        products,
        new ResolveOfferEntitlementsService(products),
        logger,
      ),
      findOfferByCode: async (code: string) => {
        const [row] = await db
          .select({ id: offerRows.id })
          .from(offerRows)
          .where(eq(offerRows.code, code))
          .limit(1)
        return row ? offers.findById(row.id) : null
      },
    }
    expect(await db.select().from(productRows)).toHaveLength(0)
    for (const mode of ['plan', 'status'] as const)
      expect((await runCatalogSeed(mode, ports)).created).toEqual([])
    expect(await db.select().from(productRows)).toHaveLength(0)
    expect(await db.select().from(offerRows)).toHaveLength(0)
    const applied = await runCatalogSeed('apply', ports)
    expect(applied.outcome).toBe('complete')
    expect(applied.created).toHaveLength(29)
    expect(await db.select().from(productRows)).toHaveLength(18)
    expect(await db.select().from(offerRows)).toHaveLength(11)
    expect((await runCatalogSeed('apply', ports)).created).toEqual([])
    const studio = await products.findBySku('estudio-completo')
    const offer = await offers.findBySlug('estudio-completo')
    if (!studio || !offer) throw new Error('Missing seeded product/offer')
    studio.updateDetails({ name: 'Admin SQL', kind: 'community' })
    offer.updateDetails({ priceCents: 4321 })
    await products.update(studio)
    await offers.update(offer)
    const before = JSON.stringify({
      product: (await products.findById(studio.id))?.toSnapshot(),
      offer: (await offers.findById(offer.id))?.toSnapshot(),
    })
    const report = await runCatalogSeed('apply', ports)
    expect(report.created).toEqual([])
    expect(
      report.after.products.find((p) => p.key === 'estudio-completo')?.differingFields,
    ).toContain('kind')
    expect(
      report.after.offers.find((o) => o.key === 'estudio-completo')?.differingFields,
    ).toContain('priceCents')
    expect(
      JSON.stringify({
        product: (await products.findById(studio.id))?.toSnapshot(),
        offer: (await offers.findById(offer.id))?.toSnapshot(),
      }),
    ).toBe(before)
  }, 30_000)
})
