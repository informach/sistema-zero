import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { prepareTestDatabase } from './test-database'

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
      // ⚠️ As 4 colunas extras entram aqui E no INSERT porque outra suíte da pasta cria
      // esta MESMA tabela com elas NOT NULL, e o `create table if not exists` do primeiro
      // arquivo a rodar é quem vence. Sem os dois lados, o teste passa ou quebra conforme a
      // ORDEM dos arquivos: coluna inexistente (42703) se ele vier primeiro, NOT NULL
      // violado se vier depois. Declaradas NULLABLE e `context_type` como TEXT (lá é enum,
      // que pode nem existir ainda) de propósito — aceita os dois mundos.
      `teacher_threads (id uuid primary key, user_id uuid not null, account_id uuid,
        audience text, context_type text, last_message_at timestamptz, created_at timestamptz)`,
      'teacher_messages (id uuid primary key, thread_id uuid not null)',
      'pensa_projects (id uuid primary key, user_id uuid not null, account_id uuid)',
      // O DDL aqui é escrito à mão, então tabela nova alcançada pela purga precisa
      // entrar nesta lista — senão o teste quebra com 42P01. Foi o caso do Zappy
      // (migration `0054`), que só aflorou quando o Postgres local voltou.
      'zappy_conversations (id uuid primary key, user_id uuid not null, account_id uuid)',
      // Mesma regra dos dois mundos: a `ai-usage-atomicity.test.ts` cria esta tabela
      // com o DDL espelho da migration 0041 (`used`/`privileged`/`updated_at` NOT NULL
      // com default) e lê `used`. Sem as três colunas aqui, quando ESTE arquivo roda
      // primeiro a outra suíte cai com 42703 (`column ai_usage_daily.used does not
      // exist`) — foi o CI de 02/09/2026. Com default, o INSERT de 3 colunas segue igual.
      `ai_usage_daily (account_id uuid not null, day date not null, feature varchar(40) not null,
        used integer default 0 not null, privileged boolean default false not null,
        updated_at timestamptz default now() not null,
        constraint ai_usage_daily_pk primary key (account_id, day, feature))`,
      'parent_reports_sent (account_id uuid not null, week_key text not null)',
      'parent_report_prefs (account_id uuid primary key)',
      'renewal_reminders_sent (entitlement_id uuid not null, expires_on date not null)',
      // "Guardado na sua conta" (migration 0067). Mesma regra dos dois mundos das
      // `teacher_threads`: a `creations.repository.test.ts` cria esta tabela com o DDL
      // completo (várias colunas NOT NULL, `tool` enum) — por isso as colunas extras
      // entram aqui NULLABLE (e `tool` como text) E no INSERT.
      `creations (id uuid primary key, user_id uuid not null, account_id uuid not null,
        tool text, item_id varchar(64), name varchar(120), kind varchar(40),
        item_updated_at timestamptz, created_at timestamptz, synced_at timestamptz)`,
      'account_deletion_fences (account_id uuid primary key, created_at timestamptz not null)',
      `creation_cleanup_jobs (id uuid primary key, account_id uuid not null unique,
        user_ids jsonb not null default '[]'::jsonb, prefixes jsonb not null,
        not_before timestamptz not null, attempts integer not null default 0,
        locked_at timestamptz, last_error text, completed_at timestamptz,
        created_at timestamptz not null, updated_at timestamptz not null)`,
    ]
    for (const definition of userTables) {
      await conn.sql.unsafe(`create table if not exists members.${definition}`)
    }
    await conn.sql.unsafe(
      `alter table members.creation_cleanup_jobs add column if not exists user_ids jsonb not null default '[]'::jsonb`,
    )
    // O outro lado da regra dos dois mundos: se OUTRA suíte criou `teacher_threads`/
    // `teacher_messages` primeiro com MENOS colunas, o create acima virou no-op e o
    // INSERT/DELETE daqui quebraria com 42703 conforme a ordem. Nullable de
    // propósito (o INSERT daqui sempre preenche o que usa).
    for (const column of [
      'user_id uuid',
      'account_id uuid',
      'audience text',
      'context_type text',
      'last_message_at timestamptz',
      'created_at timestamptz',
    ]) {
      await conn.sql.unsafe(
        `alter table members.teacher_threads add column if not exists ${column}`,
      )
    }
    await conn.sql.unsafe(
      'alter table members.teacher_messages add column if not exists thread_id uuid',
    )
  })

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    // ⚠️ CASCADE não é preguiça: o banco de tests/db é COMPARTILHADO entre os arquivos da
    // pasta e cada um cria o DDL de que precisa. Basta outra suíte criar uma tabela que
    // referencie uma daqui (foi o `teacher_thread_staff_reads` → `teacher_threads`) para o
    // TRUNCATE nu ser RECUSADO — e, como depende de qual arquivo rodou antes, isso quebra
    // por ordem, não por lógica. Aqui a semântica desejada é "limpe o que depender disto".
    await conn.sql`
      truncate table
        members.creation_cleanup_jobs,
        members.account_deletion_fences,
        members.creations,
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
      cascade
    `
  })

  test('remove dados de todas as tabelas pessoais, inclusive as adicionadas recentemente', async () => {
    const accountId = randomUUID()
    const profileId = randomUUID()
    const entitlementId = randomUUID()

    await conn.sql`insert into members.entitlements (id, user_id) values (${entitlementId}, ${accountId})`
    await conn.sql`
      insert into members.teacher_threads
        (id, user_id, account_id, audience, context_type, last_message_at, created_at)
      values
        (${randomUUID()}, ${profileId}, ${accountId}, 'kids', 'general', now(), now())`
    await conn.sql`insert into members.pensa_projects (id, user_id, account_id) values (${randomUUID()}, ${profileId}, ${accountId})`
    await conn.sql`insert into members.ai_usage_daily (account_id, day, feature) values (${accountId}, '2026-07-24', 'pensa-chat')`
    await conn.sql`insert into members.parent_reports_sent (account_id, week_key) values (${accountId}, 'w:2026-07-20')`
    await conn.sql`insert into members.parent_report_prefs (account_id) values (${accountId})`
    await conn.sql`insert into members.renewal_reminders_sent (entitlement_id, expires_on) values (${entitlementId}, '2026-08-01')`
    // Uma criação do PERFIL (user_id = perfil) e outra só da CONTA: as duas somem.
    await conn.sql`
      insert into members.creations
        (id, user_id, account_id, tool, item_id, name, kind, item_updated_at, created_at, synced_at)
      values
        (${randomUUID()}, ${profileId}, ${accountId}, 'studio', 'proj-1', 'Nave', 'classic', now(), now(), now()),
        (${randomUUID()}, ${accountId}, ${accountId}, 'pinta', 'd-1', 'nave', 'pixel-sprite', now(), now(), now())`

    const cleanupId = randomUUID()
    const createdAt = new Date('2026-08-19T12:00:00.000Z')
    const notBefore = new Date('2026-08-19T12:15:00.000Z')
    await new DrizzleUserDataPurgeRepository(conn.db).purgeForUser({
      userIds: [accountId, profileId],
      accountId,
      cleanup: {
        id: cleanupId,
        prefixes: [`creations/${accountId}/`, `creations/${profileId}/`],
        notBefore,
        createdAt,
      },
    })

    const tables = [
      'creations',
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
    const [fence] = await conn.sql`
      select account_id from members.account_deletion_fences where account_id = ${accountId}`
    expect(fence?.account_id).toBe(accountId)
    const [job] = await conn.sql<
      Array<{ id: string; prefixes: string[]; not_before: string; completed_at: string | null }>
    >`select id, prefixes, not_before, completed_at
      from members.creation_cleanup_jobs where account_id = ${accountId}`
    expect(job?.id).toBe(cleanupId)
    expect(job?.prefixes).toEqual([`creations/${accountId}/`, `creations/${profileId}/`])
    expect(new Date(job?.not_before ?? '').toISOString()).toBe(notBefore.toISOString())
    expect(job?.completed_at).toBeNull()
  })

  test('espera reservas em voo no mesmo lock antes de instalar a cerca e apagar o índice', async () => {
    const accountId = randomUUID()
    const profileId = randomUUID()
    let releaseLock!: () => void
    let confirmLock!: () => void
    const locked = new Promise<void>((resolve) => {
      confirmLock = resolve
    })
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve
    })
    const holder = conn.sql.begin(async (sql) => {
      await sql`select pg_advisory_xact_lock(hashtextextended(${`creation-quota:${profileId}`}, 0))`
      confirmLock()
      await release
    })
    await locked

    let settled = false
    const purge = new DrizzleUserDataPurgeRepository(conn.db)
      .purgeForUser({
        userIds: [accountId, profileId],
        accountId,
        cleanup: {
          id: randomUUID(),
          prefixes: [`creations/${accountId}/`, `creations/${profileId}/`],
          notBefore: new Date('2026-08-19T12:15:00.000Z'),
          createdAt: new Date('2026-08-19T12:00:00.000Z'),
        },
      })
      .finally(() => {
        settled = true
      })
    await Bun.sleep(30)
    expect(settled).toBe(false)

    releaseLock()
    await holder
    await purge
    expect(settled).toBe(true)
  })
})
