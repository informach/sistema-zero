import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Explicit disposable database only. Each run has its own database and journal.
const base = process.env.TEST_DATABASE_URL
if (base && !['localhost', '127.0.0.1'].includes(new URL(base).hostname))
  throw new Error('Annual price migration test requires local disposable PostgreSQL')
const name = `catalog_annual_${crypto.randomUUID().replaceAll('-', '')}`
const folder = path.join(import.meta.dir, '../../src/infrastructure/persistence/drizzle/migrations')
const migration = readFileSync(path.join(folder, '0011_community-annual-970.sql'), 'utf8')

describe.skipIf(!base)('annual price migration — real PostgreSQL', () => {
  let admin: ReturnType<typeof postgres>
  let sql: ReturnType<typeof postgres>
  beforeAll(async () => {
    admin = postgres(base!, { max: 1, onnotice: () => {} })
    await admin.unsafe(`CREATE DATABASE ${name}`)
    const url = new URL(base!)
    url.pathname = `/${name}`
    sql = postgres(url.toString(), { max: 1, onnotice: () => {} })
    await migrate(drizzle(sql), { migrationsFolder: folder, migrationsTable: 'catalog_migrations' })
  })
  afterAll(async () => {
    await sql?.end({ timeout: 1 })
    if (admin) {
      await admin.unsafe(`DROP DATABASE IF EXISTS ${name}`)
      await admin.end({ timeout: 1 })
    }
  })
  test('updates only old annual BRL prices once, preserving custom prices and other offers', async () => {
    const product = crypto.randomUUID()
    await sql`insert into catalog.products (id, audience, sku, slug, name, created_at, updated_at)
      values (${product}, 'kids', 'migration-test', 'migration-test', 'Test', now(), now())`
    const kids = 'comunidade-dos-criadores-anual'
    const adult = 'comunidade-dos-criadores-adulto-anual'
    const monthly = 'comunidade-dos-criadores-mensal'
    for (const slug of [kids, adult, monthly, 'other-annual'])
      await sql`insert into catalog.offers
        (id, product_id, code, slug, name, price_cents, pricing_mode, access_mode,
         billing_interval_months, created_at, updated_at)
        values (${crypto.randomUUID()}, ${product}, ${slug}, ${slug}, 'Test',
          ${slug === monthly ? 9700 : 79700}, 'subscription', 'billing_cycle',
          ${slug === monthly ? 1 : 12}, '2026-01-01', '2026-01-01')`
    await sql.unsafe(migration)
    const rows =
      await sql`select slug, price_cents, version, updated_at from catalog.offers order by slug`
    for (const slug of [kids, adult]) {
      expect(rows.find((r) => r.slug === slug)).toMatchObject({ price_cents: 97000, version: 1 })
      expect(new Date(rows.find((r) => r.slug === slug)!.updated_at).getTime()).toBeGreaterThan(
        Date.parse('2026-01-01'),
      )
    }
    expect(rows.find((r) => r.slug === monthly)).toMatchObject({ price_cents: 9700, version: 0 })
    expect(rows.find((r) => r.slug === 'other-annual')).toMatchObject({
      price_cents: 79700,
      version: 0,
    })
    await sql.unsafe(migration)
    expect([
      ...(await sql`select slug, price_cents, version, updated_at from catalog.offers order by slug`),
    ]).toEqual([...rows])
    await sql`update catalog.offers set price_cents = 12345 where slug = ${kids}`
    await sql`update catalog.offers set price_cents = 79700, currency = 'USD' where slug = ${adult}`
    await sql.unsafe(migration)
    expect(
      (await sql`select price_cents from catalog.offers where slug = ${kids}`)[0]!.price_cents,
    ).toBe(12345)
    expect(
      (await sql`select price_cents from catalog.offers where slug = ${adult}`)[0]!.price_cents,
    ).toBe(79700)
    await sql`update catalog.offers set currency = 'BRL', billing_interval_months = 1 where slug = ${adult}`
    await sql.unsafe(migration)
    expect(
      (await sql`select price_cents from catalog.offers where slug = ${adult}`)[0]!.price_cents,
    ).toBe(79700)
  })
})
