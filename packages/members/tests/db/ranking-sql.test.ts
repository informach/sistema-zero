import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'
import { prepareTestDatabase } from './test-database'

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — ranking SQL PULADO.')
}

describe.skipIf(!testDatabaseUrl)('ranking geral (SQL real)', () => {
  let conn: DbConnection
  let repo: DrizzleGamificationRepository
  const courseId = randomUUID()
  const courseSlug = `ranking-${courseId}`
  const first = randomUUID()
  const tiedA = randomUUID()
  const tiedB = randomUUID()
  const me = randomUUID()
  const zero = randomUUID()
  const expired = randomUUID()
  const privileged = randomUUID()
  const users = [first, tiedA, tiedB, me, zero, expired, privileged]

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`
    await ensureTables(conn)
    repo = new DrizzleGamificationRepository(conn.db)

    const now = '2026-09-06T12:00:00.000Z'
    await conn.sql`
      insert into members.courses
        (id, slug, title, status, audience, level, track, sequential_lock, created_at, updated_at)
      values
        (${courseId}, ${courseSlug}, 'Ranking', 'published', 'kids', 'iniciante', '2d', true, ${now}, ${now})`

    for (const [index, userId] of users.entries()) {
      await conn.sql`
        insert into members.entitlements
          (id, version, user_id, product_id, product_kind, access_type, course_ref, snapshot,
           status, source_kind, source_id, granted_at, expires_at, idempotency_key, created_at, updated_at)
        values
          (${randomUUID()}, 0, ${userId}, ${randomUUID()}, 'course', 'course', ${courseSlug},
           ${JSON.stringify({ name: 'Ranking' })}::jsonb, 'active', 'manual', ${`ranking-${index}`},
           ${now}, ${userId === expired ? '2026-09-01T00:00:00.000Z' : null},
           ${`ranking-${courseId}-${index}`}, ${now}, ${now})`
    }

    const xpByUser = new Map([
      [first, 100],
      [tiedA, 80],
      [tiedB, 80],
      [me, 10],
      [zero, 0],
      [expired, 200],
      [privileged, 300],
    ])
    for (const userId of users) {
      await conn.sql`
        insert into members.gamification_profiles
          (id, user_id, account_id, audience, xp, streak_current, streak_best,
           last_activity_date, privileged, coin_balance, coins_earned_today,
           lifetime_coins_earned, streak_freezes, created_at, updated_at)
        values
          (${randomUUID()}, ${userId}, ${userId}, 'kids', ${xpByUser.get(userId) ?? 0}, 1, 1,
           '2026-09-06', ${userId === privileged}, 0, 0, 0, 0, ${now}, ${now})`
    }
  })

  afterAll(async () => {
    if (!conn) return
    await conn.sql`delete from members.gamification_profiles where user_id in ${conn.sql(users)}`
    await conn.sql`delete from members.entitlements where user_id in ${conn.sql(users)}`
    await conn.sql`delete from members.courses where id = ${courseId}`
    await conn.close()
  })

  test('usa RANK antes do filtro/paginação e exclui zero, expirado e equipe', async () => {
    const page = await repo.listRanking({
      audience: 'kids',
      now: new Date('2026-09-06T12:00:00.000Z'),
      limit: 2,
      offset: 0,
      userIds: [tiedB, me],
      viewerUserId: me,
    })

    expect(page).toMatchObject({ totalParticipants: 4, totalMatches: 2 })
    expect(page.entries.map((entry) => [entry.userId, entry.position])).toEqual([
      [tiedB, 2],
      [me, 4],
    ])
    expect(page.me).toMatchObject({ userId: me, position: 4, xp: 10 })
    expect(
      await repo.getRanking(zero, zero, 'kids', new Date('2026-09-06T12:00:00.000Z')),
    ).toBeNull()
  })

  test('pagina empates com posição de competição determinística', async () => {
    const page = await repo.listRanking({
      audience: 'kids',
      now: new Date('2026-09-06T12:00:00.000Z'),
      limit: 2,
      offset: 1,
    })
    expect(page.entries.map((entry) => entry.position)).toEqual([2, 2])
    expect(page.entries.map((entry) => entry.userId)).toEqual([tiedA, tiedB].sort())
  })
})

async function ensureTables(conn: DbConnection) {
  await conn.sql.unsafe('create table if not exists members.courses (id uuid primary key)')
  for (const column of [
    "slug text not null default ''",
    "title text not null default ''",
    "status text not null default 'published'",
    "audience text not null default 'kids'",
    "level text not null default 'iniciante'",
    "track text not null default '2d'",
    'sequential_lock boolean not null default true',
    'created_at timestamptz not null default now()',
    'updated_at timestamptz not null default now()',
  ]) {
    await conn.sql.unsafe(`alter table members.courses add column if not exists ${column}`)
  }

  await conn.sql.unsafe('create table if not exists members.entitlements (id uuid primary key)')
  for (const column of [
    'version integer not null default 0',
    'user_id uuid not null',
    'product_id uuid not null',
    "product_kind text not null default 'course'",
    "access_type text not null default 'course'",
    'course_ref text',
    "snapshot jsonb not null default '{}'::jsonb",
    "status text not null default 'active'",
    "source_kind text not null default 'manual'",
    "source_id text not null default ''",
    'granted_at timestamptz not null default now()',
    'expires_at timestamptz',
    "idempotency_key text not null default ''",
    'created_at timestamptz not null default now()',
    'updated_at timestamptz not null default now()',
  ]) {
    await conn.sql.unsafe(`alter table members.entitlements add column if not exists ${column}`)
  }

  await conn.sql.unsafe(
    'create table if not exists members.gamification_profiles (id uuid primary key)',
  )
  for (const column of [
    'id uuid',
    'user_id uuid not null',
    'account_id uuid not null',
    "audience text not null default 'kids'",
    'xp integer not null default 0',
    'streak_current integer not null default 0',
    'streak_best integer not null default 0',
    'last_activity_date date',
    'privileged boolean not null default false',
    'coin_balance integer not null default 0',
    'coins_earned_today integer not null default 0',
    'lifetime_coins_earned integer not null default 0',
    'streak_freezes integer not null default 0',
    'created_at timestamptz not null default now()',
    'updated_at timestamptz not null default now()',
  ]) {
    await conn.sql.unsafe(
      `alter table members.gamification_profiles add column if not exists ${column}`,
    )
  }
}
