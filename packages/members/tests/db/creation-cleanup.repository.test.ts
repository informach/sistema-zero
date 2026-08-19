import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { DrizzleCreationCleanupRepository } from '../../src/infrastructure/persistence/drizzle/creation-cleanup.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

const testDatabaseUrl = await prepareTestDatabase()

describe.skipIf(!testDatabaseUrl)('fila durável de limpeza de criações', () => {
  let conn: DbConnection
  let repo: DrizzleCreationCleanupRepository

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    await conn.sql.unsafe(`create table if not exists members.creation_cleanup_jobs (
      id uuid primary key,
      account_id uuid not null unique,
      prefixes jsonb not null,
      user_ids jsonb not null default '[]'::jsonb,
      not_before timestamptz not null,
      attempts integer not null default 0,
      locked_at timestamptz,
      last_error text,
      completed_at timestamptz,
      created_at timestamptz not null,
      updated_at timestamptz not null
    )`)
    await conn.sql.unsafe(
      `alter table members.creation_cleanup_jobs add column if not exists user_ids jsonb not null default '[]'::jsonb`,
    )
    repo = new DrizzleCreationCleanupRepository(conn.db)
  })

  beforeEach(async () => {
    await conn.sql`truncate table members.creation_cleanup_jobs`
  })

  afterAll(async () => {
    await conn?.close()
  })

  test('claim é exclusivo; falha libera para retry e complete encerra', async () => {
    const id = randomUUID()
    const now = new Date('2026-08-19T14:00:00.000Z')
    const dueAt = new Date(now.getTime() - 1).toISOString()
    const nowIso = now.toISOString()
    await conn.sql`
      insert into members.creation_cleanup_jobs
        (id, account_id, prefixes, not_before, created_at, updated_at)
      values
        (${id}, ${randomUUID()}, ${JSON.stringify(['creations/a/'])}::jsonb,
         ${dueAt}, ${nowIso}, ${nowIso})`

    const claims = await Promise.all([
      repo.claimDue(now, new Date(now.getTime() - 600_000)),
      repo.claimDue(now, new Date(now.getTime() - 600_000)),
    ])
    const claimed = claims.find((job) => job !== null)
    expect(claims.filter(Boolean)).toHaveLength(1)
    expect(claimed).toMatchObject({ id, prefixes: ['creations/a/'], attempts: 1 })

    expect(await repo.fail(id, 'R2 indisponível', now, new Date(now.getTime() + 60_000))).toBe(true)
    expect(
      await repo.claimDue(new Date(now.getTime() + 1), new Date(now.getTime() - 600_000)),
    ).toBeNull()
    expect(
      await repo.claimDue(new Date(now.getTime() + 60_000), new Date(now.getTime() - 600_000)),
    ).toMatchObject({ id, attempts: 2 })
    expect(await repo.complete(id, new Date(now.getTime() + 60_001))).toBe(true)
    expect(
      await repo.claimDue(new Date(now.getTime() + 60_002), new Date(now.getTime() - 600_000)),
    ).toBeNull()
  })
})
