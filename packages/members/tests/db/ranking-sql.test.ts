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
  const missionUser = randomUUID()
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

    const profileXpByUser = new Map([
      // Os 15 XP além do ledger simulam um prêmio de missão histórico, que antes
      // era gravado apenas no perfil.
      [first, 115],
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
          (${randomUUID()}, ${userId}, ${userId}, 'kids', ${profileXpByUser.get(userId) ?? 0}, 1, 1,
           '2026-09-06', ${userId === privileged}, 0, 0, 0, 0, ${now}, ${now})`
    }
    const ledgerXpByUser = new Map(profileXpByUser)
    ledgerXpByUser.set(first, 100)
    for (const [userId, xp] of ledgerXpByUser) {
      if (xp <= 0) continue
      await conn.sql`
        insert into members.xp_events
          (id, user_id, audience, source_type, source_id, amount, created_at)
        values
          (${randomUUID()}, ${userId}, 'kids', 'lesson_complete', ${randomUUID()}, ${xp}, ${now})`
    }
  })

  afterAll(async () => {
    if (!conn) return
    const testUsers = [...users, missionUser]
    await conn.sql`delete from members.xp_events where user_id in ${conn.sql(testUsers)}`
    await conn.sql`delete from members.mission_claims where user_id in ${conn.sql(testUsers)}`
    await conn.sql`delete from members.gamification_profiles where user_id in ${conn.sql(testUsers)}`
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

  test('o keyset conserva o snapshot do ledger entre páginas', async () => {
    const firstPageAt = new Date('2026-09-06T12:00:00.000Z')
    const firstPage = await repo.listRanking({
      audience: 'kids',
      now: firstPageAt,
      snapshot: { kind: 'capture' },
      limit: 2,
      offset: 0,
    })
    if (!firstPage.snapshot) throw new Error('snapshot da primeira página ausente')
    const boundary = firstPage.entries.at(-1)
    if (!boundary) throw new Error('primeira página vazia')

    await conn.sql`
      insert into members.xp_events
        (id, user_id, audience, source_type, source_id, amount, created_at)
      values
        (${randomUUID()}, ${me}, 'kids', 'lesson_complete', ${randomUUID()}, 200,
         '2026-09-07T12:00:00.000Z')`
    await conn.sql`
      update members.gamification_profiles
      set xp = xp + 200, updated_at = '2026-09-07T12:00:00.000Z'
      where user_id = ${me} and audience = 'kids'`

    const secondPage = await repo.listRanking({
      audience: 'kids',
      now: new Date('2026-09-07T12:00:00.000Z'),
      snapshot: { kind: 'replay', value: firstPage.snapshot },
      after: { xp: boundary.xp, userId: boundary.userId },
      limit: 2,
      offset: 0,
    })

    expect(firstPage.entries.map((entry) => entry.xp)).toEqual([115, 80])
    expect(secondPage.entries.map((entry) => entry.xp)).toEqual([80, 10])
    expect(secondPage.totalParticipants).toBe(4)
  })

  test('o snapshot não incorpora uma transação iniciada antes dele e confirmada depois', async () => {
    let transactionReady!: () => void
    let releaseTransaction!: () => void
    const ready = new Promise<void>((resolve) => {
      transactionReady = resolve
    })
    const release = new Promise<void>((resolve) => {
      releaseTransaction = resolve
    })
    const concurrentAward = conn.sql.begin(async (sql) => {
      await sql`
        insert into members.xp_events
          (id, user_id, audience, source_type, source_id, amount, created_at)
        values
          (${randomUUID()}, ${me}, 'kids', 'lesson_complete', ${randomUUID()}, 300,
           '2026-09-06T11:59:59.000Z')`
      await sql`
        update members.gamification_profiles
        set xp = xp + 300, updated_at = '2026-09-06T11:59:59.000Z'
        where user_id = ${me} and audience = 'kids'`
      transactionReady()
      await release
    })

    await ready
    try {
      const whileInFlight = await repo.listRanking({
        audience: 'kids',
        now: new Date('2026-09-06T12:00:00.000Z'),
        snapshot: { kind: 'capture' },
        viewerUserId: me,
        limit: 2,
        offset: 0,
      })
      const xpBefore = whileInFlight.me?.xp
      if (xpBefore === undefined) throw new Error('perfil do viewer ausente')
      if (!whileInFlight.snapshot) throw new Error('snapshot da primeira página ausente')

      releaseTransaction()
      await concurrentAward

      const afterCommit = await repo.listRanking({
        audience: 'kids',
        now: new Date('2026-09-07T12:00:00.000Z'),
        snapshot: { kind: 'replay', value: whileInFlight.snapshot },
        viewerUserId: me,
        limit: 2,
        offset: 0,
      })
      expect(afterCommit.me?.xp).toBe(xpBefore)
    } finally {
      releaseTransaction()
      await concurrentAward
    }
  })

  test('claim de missão persiste XP no perfil e no ledger sem mover o streak', async () => {
    const now = new Date('2026-09-06T15:00:00.000Z')
    const nowIso = now.toISOString()
    await conn.sql`
      insert into members.gamification_profiles
        (id, user_id, account_id, audience, xp, streak_current, streak_best,
         last_activity_date, privileged, coin_balance, coins_earned_today,
         coins_earned_date, lifetime_coins_earned, streak_freezes, created_at, updated_at)
      values
        (${randomUUID()}, ${missionUser}, ${missionUser}, 'kids', 20, 4, 7,
         '2026-09-05', true, 0, 0, '2026-09-06', 0, 0, ${nowIso}, ${nowIso})`

    const input = {
      userId: missionUser,
      audience: 'kids' as const,
      missionSlug: 'missao-ledger',
      periodKey: '2026-09-06',
      rewardXp: 15,
      rewardCoins: 0,
      today: '2026-09-06',
      now,
    }
    expect(await repo.claimMission(input)).toMatchObject({ claimed: true, xpAwarded: 15 })
    expect(await repo.claimMission(input)).toMatchObject({ claimed: false, xpAwarded: 0 })

    const [profile] = await conn.sql`
      select xp, streak_current, streak_best, last_activity_date::text
      from members.gamification_profiles
      where user_id = ${missionUser} and audience = 'kids'`
    expect(profile).toMatchObject({
      xp: 35,
      streak_current: 4,
      streak_best: 7,
      last_activity_date: '2026-09-05',
    })

    const events = await conn.sql`
      select e.source_type::text, e.amount, e.transaction_id::text
      from members.xp_events e
      join members.mission_claims c on c.id = e.source_id
      where e.user_id = ${missionUser} and e.source_type::text = 'mission_reward'`
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ source_type: 'mission_reward', amount: 15 })
    expect(events[0]?.transaction_id).toMatch(/^\d+$/)
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
    'coins_earned_date date',
    'lifetime_coins_earned integer not null default 0',
    'streak_freezes integer not null default 0',
    'created_at timestamptz not null default now()',
    'updated_at timestamptz not null default now()',
  ]) {
    await conn.sql.unsafe(
      `alter table members.gamification_profiles add column if not exists ${column}`,
    )
  }

  await conn.sql.unsafe('create table if not exists members.xp_events (id uuid primary key)')
  for (const column of [
    'user_id uuid not null',
    "audience text not null default 'adult'",
    "source_type text not null default 'lesson_complete'",
    'source_id uuid not null',
    'amount integer not null default 0',
    'source_level text',
    'source_track text',
    'source_career_slot smallint',
    'transaction_id xid8 not null default pg_current_xact_id()',
    'created_at timestamptz not null default now()',
  ]) {
    await conn.sql.unsafe(`alter table members.xp_events add column if not exists ${column}`)
  }
  await conn.sql.unsafe(
    'create unique index if not exists xp_events_user_source_uq on members.xp_events (user_id, source_type, source_id)',
  )
  await conn.sql.unsafe(
    'create index if not exists xp_events_ranking_snapshot_idx on members.xp_events (audience, transaction_id, user_id)',
  )

  await conn.sql.unsafe('create table if not exists members.mission_claims (id uuid primary key)')
  for (const column of [
    'id uuid',
    'user_id uuid not null',
    "audience text not null default 'kids'",
    "mission_slug text not null default ''",
    "period_key text not null default ''",
    'claimed_at timestamptz not null default now()',
  ]) {
    await conn.sql.unsafe(`alter table members.mission_claims add column if not exists ${column}`)
  }
  await conn.sql.unsafe(
    'create unique index if not exists mission_claims_user_mission_period_uq on members.mission_claims (user_id, audience, mission_slug, period_key)',
  )
}
