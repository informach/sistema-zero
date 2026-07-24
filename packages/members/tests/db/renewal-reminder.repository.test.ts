import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRenewalReminderRepository } from '../../src/infrastructure/persistence/drizzle/renewal-reminder.repository'

const TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

async function prepareTestDatabase(): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override) return override
    try {
      await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    return withDatabase(baseUrl, TEST_DB_NAME)
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste de lembrete PULADO.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleRenewalReminderRepository no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(`
      create table if not exists members.entitlements (
        id uuid primary key,
        user_id uuid not null
      )
    `)
    await conn.sql.unsafe(`
      alter table members.entitlements
        add column if not exists snapshot jsonb not null default '{}'::jsonb,
        add column if not exists status text not null default 'active',
        add column if not exists source_kind text not null default 'payment',
        add column if not exists subscription_id text,
        add column if not exists expires_at timestamp with time zone
    `)
    await conn.sql.unsafe(`
      create table if not exists members.renewal_reminders_sent (
        entitlement_id uuid not null,
        expires_on date not null,
        primary key (entitlement_id, expires_on)
      )
    `)
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    // Janela exclusiva deste fixture; evita que uma execução anterior do teste
    // influencie qual grupo o LIMIT escolhe no banco persistente de testes.
    await conn.sql`
      delete from members.renewal_reminders_sent
      where entitlement_id in (
        select id from members.entitlements
        where expires_at >= '2027-05-25T00:00:00Z'
          and expires_at <= '2027-05-31T00:00:00Z'
      )
    `
    await conn.sql`
      delete from members.entitlements
      where expires_at >= '2027-05-25T00:00:00Z'
        and expires_at <= '2027-05-31T00:00:00Z'
    `
  })

  test('limita grupos sem separar as matrículas de uma compra', async () => {
    const samePurchaseUserId = randomUUID()
    const nextPurchaseUserId = randomUUID()
    const samePurchaseIds = [randomUUID(), randomUUID(), randomUUID()]
    const nextPurchaseId = randomUUID()
    const expiresAt = '2027-05-30T00:00:00Z'
    const nextExpiresAt = '2027-05-31T00:00:00Z'
    const snapshot = JSON.stringify({ offerSlug: 'clube-anual', name: 'Clube dos Criadores' })

    for (const id of samePurchaseIds) {
      await conn.sql`
        insert into members.entitlements
          (id, user_id, snapshot, status, source_kind, subscription_id, expires_at)
        values (${id}, ${samePurchaseUserId}, ${snapshot}::jsonb, 'active', 'payment', null, ${expiresAt})
      `
    }
    await conn.sql`
      insert into members.entitlements
        (id, user_id, snapshot, status, source_kind, subscription_id, expires_at)
      values (${nextPurchaseId}, ${nextPurchaseUserId}, ${snapshot}::jsonb, 'active', 'payment', null, ${nextExpiresAt})
    `

    const rows = await new DrizzleRenewalReminderRepository(conn.db).listExpiringTermEntitlements(
      new Date('2027-05-25T00:00:00Z'),
      new Date('2027-05-31T00:00:00Z'),
      1,
    )

    expect(rows).toHaveLength(3)
    expect(new Set(rows.map((row) => row.id))).toEqual(new Set(samePurchaseIds))
  })
})
