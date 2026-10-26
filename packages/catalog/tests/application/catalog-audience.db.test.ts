import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createLogger } from '@sistemazero/core/logging'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { CreateCouponService } from '../../src/application/create-coupon/create-coupon.service'
import { CreateOfferService } from '../../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../../src/application/create-product/create-product.service'
import { ListCouponsService } from '../../src/application/list-coupons/list-coupons.service'
import { ListOffersService } from '../../src/application/list-offers/list-offers.service'
import { ListProductsService } from '../../src/application/list-products/list-products.service'
import { ResolveOfferEntitlementsService } from '../../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { DrizzleCouponRepository } from '../../src/infrastructure/persistence/drizzle/coupon.repository'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleOfferRepository } from '../../src/infrastructure/persistence/drizzle/offer.repository'
import { DrizzleProductRepository } from '../../src/infrastructure/persistence/drizzle/product.repository'

const url = process.env.CATALOG_AUDIENCE_TEST_DATABASE_URL
if (url) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(target.hostname) ||
    !target.port ||
    target.pathname !== '/catalog_audience_test'
  )
    throw Error('Audience DB tests require their isolated loopback database')
}
const migrationRoot = new URL(
  '../../src/infrastructure/persistence/drizzle/migrations/',
  import.meta.url,
)
const backfill = readFileSync(new URL('0009_catalog_audience_backfill.sql', migrationRoot), 'utf8')
  .split('--> statement-breakpoint')
  .filter((s) => s.trim())

describe.skipIf(!url)('comunidade do catálogo em PostgreSQL real', () => {
  const connection = url ? createDbConnection(url, { max: 2 }) : null
  const clear = async () => {
    await connection!.sql.unsafe(
      'TRUNCATE catalog.products, catalog.offers, catalog.coupons CASCADE',
    )
  }
  beforeAll(async () => {
    await migrate(connection!.db, {
      migrationsFolder: fileURLToPath(migrationRoot),
      migrationsTable: 'catalog_migrations',
    })
  })
  beforeEach(clear)
  afterAll(async () => {
    if (connection) {
      await clear()
      await connection.close()
    }
  })
  async function apply() {
    await connection!.sql.begin(async (tx) => {
      for (const statement of backfill) await tx.unsafe(statement)
    })
  }
  async function legacy(sku: string) {
    const id = crypto.randomUUID()
    await connection!
      .sql`insert into catalog.products(id,version,sku,slug,name,created_at,updated_at) values(${id},4,${sku},${sku},${sku},'2026-01-01','2026-01-02')`
    return id
  }
  test('backfill explícito é idempotente e preserva identidade, versão, metadata e datas', async () => {
    await legacy('estudio-completo')
    await legacy('adult-estudio-completo')
    await legacy('desafio-do-primeiro-jogo')
    const before = await connection!
      .sql`select id,version,metadata,created_at,updated_at from catalog.products order by sku`
    await apply()
    await apply()
    expect(
      await connection!
        .sql`select id,version,metadata,created_at,updated_at from catalog.products order by sku`,
    ).toEqual(before)
    expect(
      (await connection!.sql`select sku,audience from catalog.products order by sku`).map((row) => [
        row.sku,
        row.audience,
      ]),
    ).toEqual([
      ['adult-estudio-completo', 'adult'],
      ['desafio-do-primeiro-jogo', 'kids'],
      ['estudio-completo', 'kids'],
    ])
  })
  test('produto desconhecido interrompe a classificação e reverte as atualizações do lote', async () => {
    await legacy('estudio-completo')
    await legacy('produto-sem-classificacao')
    const failure = await apply().then(
      () => null,
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(Error)
    expect(failure instanceof Error && failure.message).toContain('Unclassified catalog products')
    expect(
      (
        await connection!
          .sql`select count(*)::integer as total from catalog.products where audience is null`
      )[0]?.total,
    ).toBe(2)
  })
  test('consulta e total são filtrados antes de paginar produtos, ofertas e cupons', async () => {
    const products = new DrizzleProductRepository(connection!.db),
      offers = new DrizzleOfferRepository(connection!.db),
      coupons = new DrizzleCouponRepository(connection!.db)
    const logger = createLogger({ level: 'error' })
    const create = new CreateProductService(products, logger),
      resolver = new ResolveOfferEntitlementsService(products)
    const createOffer = new CreateOfferService(offers, products, resolver, logger),
      createCoupon = new CreateCouponService(coupons, offers, products, logger)
    for (const [index, audience] of ['kids', 'adult', 'kids'].entries()) {
      const slug = `produto-${index}`
      const product = await create.execute({
        audience: audience as 'kids' | 'adult',
        sku: slug,
        slug,
        name: slug,
      })
      await createOffer.execute({
        productId: product.id,
        code: slug,
        slug,
        name: slug,
        priceCents: 1000,
      })
      await createCoupon.execute({
        audience: audience as 'kids' | 'adult',
        code: `COUPON${index}`,
        type: 'percent',
        percentOff: 10,
        appliesToAll: true,
      })
    }
    for (const list of [
      new ListProductsService(products),
      new ListOffersService(offers, products),
      new ListCouponsService(coupons),
    ]) {
      const first = await list.execute({ audience: 'kids', limit: 1, offset: 0 })
      const second = await list.execute({ audience: 'kids', limit: 1, offset: 1 })
      const adult = await list.execute({ audience: 'adult', limit: 20, offset: 0 })
      expect(first.total).toBe(2)
      expect(second.total).toBe(2)
      expect(adult.total).toBe(1)
      expect(first.items).toHaveLength(1)
      expect(second.items).toHaveLength(1)
      expect(adult.items).toHaveLength(1)
      expect(first.items[0]?.id).not.toBe(second.items[0]?.id)
      expect(first.items[0]?.id).not.toBe(adult.items[0]?.id)
    }
  })
})
