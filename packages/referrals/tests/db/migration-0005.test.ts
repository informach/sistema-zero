import { afterAll, describe, expect, test } from 'bun:test'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

/**
 * A 0005 sobre dados EXISTENTES: aplica 0000-0004 num banco descartável, grava linhas no
 * formato antigo (código com `panel_audience` nulo, resgate sem público), aplica a 0005 e
 * confere backfill, defaults, os UNIQUEs novos e a ausência dos antigos.
 * Sem Postgres alcançável (ou sem `TEST_DATABASE_URL`/5433) a suíte é PULADA.
 */
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'
const DB_NAME = 'referrals_migration_0005_test'
const MIGRATIONS = path.join(
  import.meta.dir,
  '../../src/infrastructure/persistence/drizzle/migrations',
)

function withDatabase(url: string, dbName: string): string {
  const u = new URL(url)
  u.pathname = `/${dbName}`
  return u.toString()
}

async function prepare(): Promise<string | null> {
  const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    await admin.unsafe(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE)`)
    await admin.unsafe(`CREATE DATABASE ${DB_NAME}`)
    return withDatabase(baseUrl, DB_NAME)
  } catch {
    return null
  } finally {
    await admin.end({ timeout: 1 }).catch(() => {})
  }
}

const url = await prepare()
if (!url) console.warn('[tests/db] Postgres indisponível — teste da migração 0005 PULADO.')

describe.skipIf(!url)('migração 0005 (presente Kids e adulto) sobre dados existentes', () => {
  const sql = url ? postgres(url, { max: 2, onnotice: () => {} }) : null
  const dirs: string[] = []

  afterAll(async () => {
    await sql?.end({ timeout: 1 })
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true })
  })

  test('backfill kids, NOT NULL, UNIQUEs novos e CHECKs', async () => {
    if (!sql) return
    const db = drizzle(sql)
    // Pasta com o journal cortado até a 0004 (o estado de produção antes do deploy).
    const before = mkdtempSync(path.join(tmpdir(), 'referrals-0004-'))
    dirs.push(before)
    cpSync(MIGRATIONS, before, { recursive: true })
    const journalPath = path.join(before, 'meta/_journal.json')
    const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as {
      entries: { tag: string }[]
    }
    journal.entries = journal.entries.filter((e) => e.tag !== '0005_gift_audience')
    writeFileSync(journalPath, JSON.stringify(journal))
    await migrate(db, { migrationsFolder: before, migrationsTable: 'referrals_migrations' })

    const [ambassador] = await sql<{ id: string }[]>`
      insert into referrals.ambassadors (name, email, page_token)
      values ('Cida', 'cida@example.com', 'token-antigo-0123456789') returning id`
    const [code] = await sql<{ id: string; panel_audience: string | null }[]>`
      insert into referrals.codes (code, owner_kind, ambassador_id, display_name)
      values ('cida-x7k2', 'ambassador', ${ambassador!.id}, 'Cida') returning id, panel_audience`
    expect(code?.panel_audience).toBeNull()
    await sql`insert into referrals.scholarship_redemptions (code_id, email, name, status)
      values (${code!.id}, 'paula@example.com', 'Paula', 'completed')`
    await sql`insert into referrals.campaigns (name, public_title, context, starts_at, ends_at)
      values ('Antiga', 'Antiga', 'event', now(), now() + interval '1 day')`

    await migrate(db, { migrationsFolder: MIGRATIONS, migrationsTable: 'referrals_migrations' })

    expect([...(await sql`select panel_audience from referrals.codes`)]).toEqual([
      { panel_audience: 'kids' },
    ])
    expect([...(await sql`select audience from referrals.scholarship_redemptions`)]).toEqual([
      { audience: 'kids' },
    ])
    expect([...(await sql`select audience from referrals.campaigns`)]).toEqual([
      { audience: 'kids' },
    ])

    const indexes = (
      await sql<{ indexname: string }[]>`
        select indexname from pg_indexes where schemaname = 'referrals'`
    ).map((r) => r.indexname)
    expect(indexes).toContain('scholarship_redemptions_email_audience_uq')
    expect(indexes).toContain('codes_ambassador_audience_uq')
    expect(indexes).not.toContain('scholarship_redemptions_email_uq')
    expect(indexes).not.toContain('codes_ambassador_uq')

    // O mesmo e-mail ganha um presente adulto; um segundo código adulto do mesmo embaixador não.
    const [adult] = await sql<{ id: string }[]>`
      insert into referrals.codes (code, owner_kind, ambassador_id, display_name, panel_audience)
      values ('cida-ad45', 'ambassador', ${ambassador!.id}, 'Cida', 'adult') returning id`
    await sql`insert into referrals.scholarship_redemptions (code_id, email, name, audience)
      values (${adult!.id}, 'paula@example.com', 'Paula', 'adult')`
    let duplicated = false
    try {
      await sql`insert into referrals.codes (code, owner_kind, ambassador_id, display_name, panel_audience)
        values ('cida-ad99', 'ambassador', ${ambassador!.id}, 'Cida', 'adult')`
    } catch (error) {
      duplicated = (error as { code?: string }).code === '23505'
    }
    expect(duplicated).toBe(true)
    // Código novo sem o campo (container antigo durante o deploy) nasce Kids.
    const [legacy] = await sql<{ panel_audience: string }[]>`
      insert into referrals.codes (code, owner_kind, campaign_id, display_name)
      select 'antiga-2026', 'campaign', id, 'Antiga' from referrals.campaigns returning panel_audience`
    expect(legacy?.panel_audience).toBe('kids')

    // Os CHECKs novos recusam público fora de kids/adult.
    let checked = false
    try {
      await sql`update referrals.codes set panel_audience = 'pro' where id = ${adult!.id}`
    } catch (error) {
      checked = (error as { code?: string }).code === '23514'
    }
    expect(checked).toBe(true)
  })
})
