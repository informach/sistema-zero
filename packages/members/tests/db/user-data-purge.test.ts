import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { PurgeUserDataService } from '../../src/application/admin/purge-user-data/purge-user-data.service'
import { InvalidStateTransitionError } from '../../src/domain/shared/errors'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleKidsJourneyRepository } from '../../src/infrastructure/persistence/drizzle/kids-journey.repository'
import { DrizzlePensaProjectRepository } from '../../src/infrastructure/persistence/drizzle/pensa-project.repository'
import { DrizzleUserDataPurgeRepository } from '../../src/infrastructure/persistence/drizzle/user-data-purge.repository'
import { openPensaTestDatabase } from './pensa-native-database'
import { prepareTestDatabase } from './test-database'

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste de purga PULADO.')
}

describe.skipIf(!testDatabaseUrl)('Purga de dados do usuário no Postgres real', () => {
  let conn: DbConnection

  beforeAll(async () => {
    if (!testDatabaseUrl) throw new Error('The PostgreSQL test target is missing')
    const target = new URL(testDatabaseUrl)
    target.pathname = '/pensa_account_purge_test'
    conn = await openPensaTestDatabase('pensa_account_purge_test', false, target.toString())
  }, 60_000)

  afterAll(async () => {
    await conn?.close()
  })

  beforeEach(async () => {
    // Isolated database with the real schema: new purge dependencies cannot be hidden
    // by partial handwritten tables or by whichever shared test happened to run first.
    const tables = await conn.sql<{ name: string }[]>`
      select format('%I.%I', schemaname, tablename) as name
      from pg_tables where schemaname = 'members'
    `
    await conn.sql.unsafe(`truncate table ${tables.map((table) => table.name).join(', ')} cascade`)
  })

  async function addEntitlement(accountId: string, id = randomUUID()) {
    await conn.sql`insert into members.entitlements
      (id, user_id, product_id, product_kind, access_type, snapshot, source_kind,
       source_id, granted_at, idempotency_key, created_at, updated_at)
      values (${id}, ${accountId}, ${randomUUID()}, 'course', 'course', '{}'::jsonb, 'manual',
        ${randomUUID()}, now(), ${randomUUID()}, now(), now())`
  }

  async function addXp(profileId: string) {
    await conn.sql`insert into members.xp_events
      (id, user_id, source_type, source_id, amount, created_at)
      values (${randomUUID()}, ${profileId}, 'lesson_complete', ${randomUUID()}, 10, now())`
  }

  async function addSectionProgress(profileId: string, accountId: string) {
    const courseId = randomUUID(),
      moduleId = randomUUID(),
      lessonId = randomUUID()
    await conn.sql`insert into members.courses (id, slug, title, created_at, updated_at)
      values (${courseId}, ${courseId}, 'Curso', now(), now())`
    await conn.sql`insert into members.modules (id, course_id, title, created_at, updated_at)
      values (${moduleId}, ${courseId}, 'Módulo', now(), now())`
    await conn.sql`insert into members.lessons
      (id, module_id, course_id, slug, title, created_at, updated_at)
      values (${lessonId}, ${moduleId}, ${courseId}, ${lessonId}, 'Aula', now(), now())`
    await conn.sql`insert into members.lesson_section_progress
      (user_id, account_id, lesson_id, section_id, revision)
      values (${profileId}, ${accountId}, ${lessonId}, ${randomUUID()}, 'revision')`
  }

  test('remove dados de todas as tabelas pessoais, inclusive as adicionadas recentemente', async () => {
    const accountId = randomUUID()
    const profileId = randomUUID()
    const entitlementId = randomUUID()

    const kids = new DrizzleKidsJourneyRepository(conn.db)
    await kids.initializeSeed()
    const preparation = (await kids.createSeedPreparation())!
    await kids.appendSeedOwners(preparation.id, [
      { userId: profileId, accountId },
      { userId: randomUUID(), accountId }, // A child omitted from purge.userIds is still account-owned.
    ])
    await addEntitlement(accountId, entitlementId)
    await conn.sql`insert into members.kids_journey_earned(user_id,account_id,level,capabilities,policy_version,updated_at)
      values (${profileId},${accountId},'coder','["studio","pinta"]'::jsonb,0,now())`
    await conn.sql`
      insert into members.teacher_threads
        (id, user_id, account_id, audience, context_type, last_message_at, created_at)
      values
        (${randomUUID()}, ${profileId}, ${accountId}, 'kids', 'general', now(), now())`
    await new DrizzlePensaProjectRepository(conn.db).create(
      { profileId, accountId, privileged: false },
      { requestId: randomUUID(), message: 'Quero criar meu jogo.' },
    )
    await conn.sql`insert into members.ai_usage_daily (account_id, day, feature) values (${accountId}, '2026-07-24', 'pensa-chat')`
    await conn.sql`insert into members.parent_reports_sent (account_id, week_key, sent_at) values (${accountId}, 'w:2026-07-20', now())`
    await conn.sql`insert into members.parent_report_prefs (account_id, updated_at) values (${accountId}, now())`
    await conn.sql`insert into members.renewal_reminders_sent (entitlement_id, expires_on) values (${entitlementId}, '2026-08-01')`
    // Uma criação do PERFIL (user_id = perfil) e outra só da CONTA: as duas somem.
    await conn.sql`
      insert into members.creations
        (id, user_id, account_id, tool, item_id, name, kind, item_updated_at, created_at, synced_at)
      values
        (${randomUUID()}, ${profileId}, ${accountId}, 'studio', 'proj-1', 'Nave', 'classic', now(), now(), now()),
        (${randomUUID()}, ${accountId}, ${accountId}, 'pinta', 'd-1', 'nave', 'pixel-sprite', now(), now(), now())`

    await addSectionProgress(profileId, accountId)
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
      'kids_journey_earned',
      'kids_journey_preparation_owners',
      'lesson_section_progress',
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

  test('finalize sem a cerca de exclusão recusa sem apagar; com a cerca, purga o que chegou depois', async () => {
    // ⚠️ É a defesa contra o worker antigo que trata a limpeza de um PLANO do Pensa como
    // exclusão de conta: `{accountId: família, userIds: [perfil]}` apagaria tudo da família.
    const accountId = randomUUID()
    const profileId = randomUUID()
    const service = new PurgeUserDataService(new DrizzleUserDataPurgeRepository(conn.db))
    await addEntitlement(accountId)
    await addXp(profileId)

    let refused: unknown = null
    try {
      await service.finalize({ userId: accountId, profileIds: [profileId] })
    } catch (cause) {
      refused = cause
    }
    expect(refused).toBeInstanceOf(InvalidStateTransitionError)
    const count = async (table: string, column: string, id: string) =>
      (
        await conn.sql.unsafe<{ n: number }[]>(
          `select count(*)::int as n from members.${table} where ${column} = $1`,
          [id],
        )
      )[0]?.n
    expect(await count('entitlements', 'user_id', accountId)).toBe(1)
    expect(await count('xp_events', 'user_id', profileId)).toBe(1)
    expect(await count('account_deletion_fences', 'account_id', accountId)).toBe(0)
    expect(await count('creation_cleanup_jobs', 'account_id', accountId)).toBe(0)

    // A exclusão de verdade: a 1ª purga instala a cerca junto com o job do worker.
    await service.execute({ userId: accountId, profileIds: [profileId] })
    expect(await count('account_deletion_fences', 'account_id', accountId)).toBe(1)
    // Uma escrita que escapou antes da cerca some na segunda purga, pedida pelo worker.
    await addXp(profileId)
    await service.finalize({ userId: accountId, profileIds: [profileId] })
    expect(await count('xp_events', 'user_id', profileId)).toBe(0)
    expect(await count('entitlements', 'user_id', accountId)).toBe(0)
  })
})
