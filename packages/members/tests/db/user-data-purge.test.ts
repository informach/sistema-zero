import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'

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
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste de purga PULADO.')
}

describe.skipIf(!testDatabaseUrl)('Purga de dados do usuário no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await conn.sql`create schema if not exists members`

    const userTables = [
      'entitlements (id uuid primary key, user_id uuid not null)',
      'lesson_completions (user_id uuid not null)',
      'lesson_progress (user_id uuid not null)',
      'quiz_attempts (user_id uuid not null)',
      'course_ratings (user_id uuid not null)',
      'xp_events (user_id uuid not null)',
      'user_badges (user_id uuid not null)',
      'coin_events (user_id uuid not null)',
      'avatar_inventory (user_id uuid not null)',
      'mission_claims (user_id uuid not null)',
      'room_inventory (user_id uuid not null)',
      'studio_submissions (user_id uuid not null, account_id uuid)',
      'gamification_profiles (user_id uuid not null, account_id uuid)',
      'avatar_configs (user_id uuid not null, account_id uuid)',
      'league_membership (user_id uuid not null, account_id uuid)',
      'room_state (user_id uuid not null, account_id uuid)',
      'certificates_issued (user_id uuid not null, account_id uuid)',
      'teacher_threads (id uuid primary key, user_id uuid not null, account_id uuid)',
      'teacher_messages (id uuid primary key, thread_id uuid not null)',
      'pensa_projects (id uuid primary key, user_id uuid not null, account_id uuid)',
      // O DDL aqui é escrito à mão, então tabela nova alcançada pela purga precisa
      // entrar nesta lista — senão o teste quebra com 42P01. Foi o caso do Zappy
      // (migration `0054`), que só aflorou quando o Postgres local voltou.
      'zappy_conversations (id uuid primary key, user_id uuid not null, account_id uuid)',
      'ai_usage_daily (account_id uuid not null, day date not null, feature varchar(40) not null)',
      'parent_reports_sent (account_id uuid not null, week_key text not null)',
      'parent_report_prefs (account_id uuid primary key)',
      'renewal_reminders_sent (entitlement_id uuid not null, expires_on date not null)',
    ]
    for (const definition of userTables) {
      await conn.sql.unsafe(`create table if not exists members.${definition}`)
    }
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    await conn.sql`
      truncate table
        members.zappy_conversations,
        members.renewal_reminders_sent,
        members.parent_report_prefs,
        members.parent_reports_sent,
        members.ai_usage_daily,
        members.pensa_projects,
        members.teacher_messages,
        members.teacher_threads,
        members.certificates_issued,
        members.room_state,
        members.league_membership,
        members.avatar_configs,
        members.gamification_profiles,
        members.studio_submissions,
        members.room_inventory,
        members.mission_claims,
        members.avatar_inventory,
        members.coin_events,
        members.user_badges,
        members.xp_events,
        members.course_ratings,
        members.quiz_attempts,
        members.lesson_progress,
        members.lesson_completions,
        members.entitlements
    `
  })

  test('remove dados de todas as tabelas pessoais, inclusive as adicionadas recentemente', async () => {
    const accountId = randomUUID()
    const profileId = randomUUID()
    const entitlementId = randomUUID()

    await conn.sql`insert into members.entitlements (id, user_id) values (${entitlementId}, ${accountId})`
    await conn.sql`insert into members.teacher_threads (id, user_id, account_id) values (${randomUUID()}, ${profileId}, ${accountId})`
    await conn.sql`insert into members.pensa_projects (id, user_id, account_id) values (${randomUUID()}, ${profileId}, ${accountId})`
    await conn.sql`insert into members.ai_usage_daily (account_id, day, feature) values (${accountId}, '2026-07-24', 'pensa-chat')`
    await conn.sql`insert into members.parent_reports_sent (account_id, week_key) values (${accountId}, 'w:2026-07-20')`
    await conn.sql`insert into members.parent_report_prefs (account_id) values (${accountId})`
    await conn.sql`insert into members.renewal_reminders_sent (entitlement_id, expires_on) values (${entitlementId}, '2026-08-01')`

    await new DrizzleUserDataPurgeRepository(conn.db).purgeForUser({
      userIds: [accountId, profileId],
      accountId,
    })

    const tables = [
      'teacher_threads',
      'pensa_projects',
      'ai_usage_daily',
      'parent_reports_sent',
      'parent_report_prefs',
      'renewal_reminders_sent',
    ]
    for (const table of tables) {
      const rows = await conn.sql.unsafe<{ count: number }[]>(
        `select count(*)::int as count from members.${table}`,
      )
      expect(rows[0]?.count).toBe(0)
    }
  })
})
