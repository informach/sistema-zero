import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { DrizzleChallengeLifecycleRepository } from '../../src/infrastructure/persistence/drizzle/challenge-lifecycle.repository'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível — teste do ciclo do Desafio PULADO.')
}

describe.skipIf(!testDatabaseUrl)('DrizzleChallengeLifecycleRepository no Postgres real', () => {
  let conn: DbConnection
  const createdIds: string[] = []

  beforeAll(async () => {
    conn = createDbConnection(testDatabaseUrl as string)
    await prepareSchema(conn)
  })

  afterAll(async () => {
    if (!conn) return
    if (createdIds.length > 0) {
      await conn.sql`delete from members.lesson_completions where user_id = any(${createdIds}::uuid[])`
      await conn.sql`delete from members.lesson_navigation where user_id = any(${createdIds}::uuid[])`
      await conn.sql`delete from members.profile_preferences where user_id = any(${createdIds}::uuid[])`
      await conn.sql`delete from members.entitlements where id = any(${createdIds}::uuid[])`
    }
    await conn.close()
  })

  test('progresso só pertence à compra pela relação explícita e não ambígua perfil→conta', async () => {
    const accountId = randomUUID()
    const otherAccountId = randomUUID()
    const correctProfileId = randomUUID()
    const wrongProfileId = randomUUID()
    const entitlementId = randomUUID()
    createdIds.push(accountId, otherAccountId, correctProfileId, wrongProfileId, entitlementId)

    const { courseId, lessonIds } = await ensureChallengeCourse(conn)
    const [firstLessonId] = lessonIds
    if (!firstLessonId) throw new Error('curso de teste sem aulas')

    const snapshot = JSON.stringify({
      offerSlug: 'desafio-primeiro-jogo-30-dias',
      name: 'Desafio do Primeiro Jogo',
      accessPolicy: { mode: 'fixed', durationValue: 30, durationUnit: 'days' },
    })
    await conn.sql`
      insert into members.entitlements
        (id, version, user_id, product_id, product_kind, access_type, course_ref, snapshot,
         status, source_kind, source_id, granted_at, expires_at, idempotency_key, created_at, updated_at)
      values (${entitlementId}, 0, ${accountId}, ${randomUUID()}, 'course', 'course',
        'desafio-primeiro-jogo', ${snapshot}::jsonb, 'active', 'payment', ${randomUUID()},
        '2026-09-16T12:00:00Z', '2026-10-16T12:00:00Z', ${`test:${entitlementId}`}, now(), now())
    `

    // Um perfil de OUTRA conta conclui tudo. O candidato da conta compradora
    // continua sem início: não existe inferência por “último perfil” ou e-mail.
    await conn.sql`
      insert into members.profile_preferences (user_id, account_id, palette, updated_at)
      values (${wrongProfileId}, ${otherAccountId}, null, now())
      on conflict (user_id) do update set account_id = excluded.account_id
    `
    for (const lessonId of lessonIds) {
      await conn.sql`
        insert into members.lesson_completions (id, user_id, lesson_id, course_id, completed_at)
        values (${randomUUID()}, ${wrongProfileId}, ${lessonId}, ${courseId}, now())
        on conflict do nothing
      `
    }

    const repo = new DrizzleChallengeLifecycleRepository(conn.db)
    const before = await repo.listCandidates(new Date('2026-09-20T12:00:00Z'), 10)
    expect(before).toHaveLength(1)
    expect(before[0]).toMatchObject({ started: false, dayOneComplete: false, completed: false })

    // `lesson_navigation.account_id` prova a posse do perfil correto.
    await conn.sql`
      insert into members.lesson_navigation (user_id, account_id, lesson_id, section_id, updated_at)
      values (${correctProfileId}, ${accountId}, ${firstLessonId}, ${randomUUID()}, now())
      on conflict do nothing
    `
    await conn.sql`
      insert into members.lesson_completions (id, user_id, lesson_id, course_id, completed_at)
      values (${randomUUID()}, ${correctProfileId}, ${firstLessonId}, ${courseId}, now())
      on conflict do nothing
    `
    const attributed = await repo.listCandidates(new Date('2026-09-20T12:00:00Z'), 10)
    expect(attributed[0]).toMatchObject({ started: true, dayOneComplete: true, completed: false })

    // Uma segunda relação conflitante torna a posse ambígua; o repositório não
    // escolhe uma conta arbitrariamente e retira esse progresso da automação.
    await conn.sql`
      insert into members.profile_preferences (user_id, account_id, palette, updated_at)
      values (${correctProfileId}, ${otherAccountId}, null, now())
      on conflict (user_id) do update set account_id = excluded.account_id
    `
    const ambiguous = await repo.listCandidates(new Date('2026-09-20T12:00:00Z'), 10)
    expect(ambiguous[0]).toMatchObject({
      started: false,
      dayOneComplete: false,
      completed: false,
    })
  })
})

async function ensureChallengeCourse(
  conn: DbConnection,
): Promise<{ courseId: string; lessonIds: string[] }> {
  let [course] = await conn.sql<{ id: string }[]>`
    select id::text as id from members.courses where slug = 'desafio-primeiro-jogo' limit 1
  `
  if (!course) {
    const id = randomUUID()
    await conn.sql`
      insert into members.courses (id, slug, title, status, audience, created_at, updated_at)
      values (${id}, 'desafio-primeiro-jogo', 'Desafio do Primeiro Jogo', 'published', 'kids', now(), now())
    `
    course = { id }
  }

  let lessonRows = await conn.sql<{ id: string }[]>`
    select l.id::text as id
      from members.lessons l
      join members.modules m on m.id = l.module_id
     where l.course_id = ${course.id} and l.is_published = true
     order by m.sort_order, l.sort_order, l.id
  `
  if (lessonRows.length === 0) {
    let [module] = await conn.sql<{ id: string }[]>`
      select id::text as id from members.modules where course_id = ${course.id}
      order by sort_order, id limit 1
    `
    if (!module) {
      const id = randomUUID()
      await conn.sql`
        insert into members.modules (id, course_id, title, sort_order, created_at, updated_at)
        values (${id}, ${course.id}, 'Desafio', 0, now(), now())
      `
      module = { id }
    }
    const [sortRow] = await conn.sql<{ next_sort: number }[]>`
      select coalesce(max(sort_order), -1)::int + 1 as next_sort
        from members.lessons where module_id = ${module.id}
    `
    const nextSort = sortRow?.next_sort ?? 0
    for (const offset of [0, 1]) {
      await conn.sql`
        insert into members.lessons
          (id, module_id, course_id, slug, title, sort_order, is_published, created_at, updated_at)
        values (${randomUUID()}, ${module.id}, ${course.id}, ${`teste-ciclo-${randomUUID()}`},
          ${`Dia ${offset + 1}`}, ${nextSort + offset}, true, now(), now())
      `
    }
    lessonRows = await conn.sql<{ id: string }[]>`
      select l.id::text as id
        from members.lessons l
        join members.modules m on m.id = l.module_id
       where l.course_id = ${course.id} and l.is_published = true
       order by m.sort_order, l.sort_order, l.id
    `
  }
  return { courseId: course.id, lessonIds: lessonRows.map((lesson) => lesson.id) }
}

async function prepareSchema(conn: DbConnection): Promise<void> {
  await conn.sql`create schema if not exists members`
  const statements = [
    `create table if not exists members.entitlements (id uuid primary key, user_id uuid not null)`,
    `alter table members.entitlements
      add column if not exists version integer not null default 0,
      add column if not exists product_id uuid,
      add column if not exists product_kind text not null default 'course',
      add column if not exists access_type text not null default 'course',
      add column if not exists course_ref text,
      add column if not exists offer_id uuid,
      add column if not exists snapshot jsonb not null default '{}'::jsonb,
      add column if not exists status text not null default 'active',
      add column if not exists source_kind text not null default 'payment',
      add column if not exists source_id text,
      add column if not exists subscription_id text,
      add column if not exists granted_at timestamptz not null default now(),
      add column if not exists expires_at timestamptz,
      add column if not exists revoked_at timestamptz,
      add column if not exists idempotency_key text,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz not null default now()`,
    `create table if not exists members.entitlement_lifecycle_messages_sent (
      entitlement_id uuid not null, expires_on date not null, message_kind text not null,
      sent_at timestamptz not null default now(), primary key (entitlement_id, expires_on, message_kind))`,
    `alter table members.entitlement_lifecycle_messages_sent
      add column if not exists entitlement_id uuid,
      add column if not exists expires_on date,
      add column if not exists message_kind text,
      add column if not exists sent_at timestamptz not null default now()`,
    `create table if not exists members.courses (
      id uuid primary key, slug text not null, title text not null, status text not null default 'published',
      audience text not null default 'kids', created_at timestamptz not null default now(),
      updated_at timestamptz not null default now())`,
    `alter table members.courses
      add column if not exists slug text,
      add column if not exists audience text not null default 'kids',
      add column if not exists title text not null default 'Curso',
      add column if not exists status text not null default 'published',
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz not null default now()`,
    `create table if not exists members.modules (
      id uuid primary key, course_id uuid not null, title text not null, sort_order integer not null default 0,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
    `alter table members.modules
      add column if not exists course_id uuid,
      add column if not exists title text not null default 'Módulo',
      add column if not exists sort_order integer not null default 0,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz not null default now()`,
    `create table if not exists members.lessons (
      id uuid primary key, module_id uuid not null, course_id uuid not null, slug text not null,
      title text not null, sort_order integer not null default 0, is_published boolean not null default true,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
    `alter table members.lessons
      add column if not exists module_id uuid,
      add column if not exists course_id uuid,
      add column if not exists slug text,
      add column if not exists title text not null default 'Aula',
      add column if not exists is_published boolean not null default true,
      add column if not exists sort_order integer not null default 0,
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists updated_at timestamptz not null default now()`,
    `create table if not exists members.gamification_profiles (
      user_id uuid not null, account_id uuid not null, audience text not null default 'kids')`,
    `alter table members.gamification_profiles
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists audience text not null default 'kids'`,
    `create table if not exists members.profile_preferences (
      user_id uuid primary key, account_id uuid not null, palette varchar(32),
      updated_at timestamptz not null default now())`,
    // ⚠️ O banco de tests/db é COMPARTILHADO e o `create ... if not exists` é
    // quem-chega-primeiro-vence: sem este `add column if not exists` a tabela criada por outro
    // arquivo ficaria sem a coluna nova, e a ordem dos arquivos não é contrato.
    `alter table members.profile_preferences
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists palette varchar(32),
      add column if not exists updated_at timestamptz not null default now()`,
    `create table if not exists members.lesson_navigation (
      user_id uuid not null, account_id uuid not null, lesson_id uuid not null, section_id uuid not null,
      updated_at timestamptz not null default now(), primary key (user_id, lesson_id))`,
    `alter table members.lesson_navigation
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists lesson_id uuid,
      add column if not exists section_id uuid,
      add column if not exists updated_at timestamptz not null default now()`,
    `create table if not exists members.lesson_section_progress (
      user_id uuid not null, account_id uuid not null, lesson_id uuid not null)`,
    `alter table members.lesson_section_progress
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists lesson_id uuid`,
    `create table if not exists members.lesson_block_progress (
      user_id uuid not null, account_id uuid not null, lesson_id uuid not null)`,
    `alter table members.lesson_block_progress
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists lesson_id uuid`,
    `create table if not exists members.learning_attempts (
      user_id uuid not null, account_id uuid not null, lesson_id uuid not null)`,
    `alter table members.learning_attempts
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists lesson_id uuid`,
    `create table if not exists members.studio_submissions (
      user_id uuid not null, account_id uuid, course_id uuid not null)`,
    `alter table members.studio_submissions
      add column if not exists user_id uuid,
      add column if not exists account_id uuid,
      add column if not exists course_id uuid`,
    `create table if not exists members.lesson_progress (user_id uuid not null, course_id uuid not null)`,
    `alter table members.lesson_progress
      add column if not exists user_id uuid,
      add column if not exists course_id uuid`,
    `create table if not exists members.lesson_completions (
      id uuid primary key, user_id uuid not null, lesson_id uuid not null, course_id uuid not null,
      completed_at timestamptz not null default now())`,
    `alter table members.lesson_completions
      add column if not exists id uuid,
      add column if not exists user_id uuid,
      add column if not exists lesson_id uuid,
      add column if not exists course_id uuid,
      add column if not exists completed_at timestamptz not null default now()`,
  ]
  for (const statement of statements) await conn.sql.unsafe(statement)
}
