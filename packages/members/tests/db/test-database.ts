import postgres from 'postgres'
import { prepareLiveTestSchema } from './live-test-schema'

const DEFAULT_TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

/**
 * Descobre o Postgres local opcional ou valida o banco explicitamente contratado pelo CI.
 * Uma `TEST_DATABASE_URL` definida nunca pode virar skip: ela é uma promessa de infraestrutura.
 */
export async function prepareTestDatabase(
  dbName: string = DEFAULT_TEST_DB_NAME,
): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  if (override !== undefined && override.trim() === '') {
    throw new Error('TEST_DATABASE_URL foi definida, mas está vazia.')
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
    throw new Error(`Nome de banco de teste inválido: ${dbName}`)
  }

  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override !== undefined) {
      await prepareBlockReadModel(admin)
      return override
    }
    try {
      await admin.unsafe(`CREATE DATABASE ${dbName}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    const target = withDatabase(baseUrl, dbName)
    const database = postgres(target, { max: 1, onnotice: () => {} })
    try {
      await prepareBlockReadModel(database)
    } finally {
      await database.end()
    }
    return target
  } catch (error) {
    if (override !== undefined) {
      throw new Error('TEST_DATABASE_URL está definida, mas o Postgres não está utilizável.', {
        cause: error,
      })
    }
    return null
  } finally {
    await admin.end({ timeout: 1 })
  }
}

/** Sparse repository fixtures share the current block read model, without production foreign keys. */
async function prepareBlockReadModel(database: ReturnType<typeof postgres>) {
  await database`create schema if not exists members`
  await prepareLiveTestSchema(database)
  // Quotas and account deletion now also reach Studio Pro. These independent
  // migrations supply their real contracts to every sparse repository fixture.
  await database.begin(async (transaction) => {
    await transaction`select pg_advisory_xact_lock(16012026, 116)`
    for (const [table, migration] of [
      ['adult_profiles', '0132_useful_jigsaw.sql'],
      ['adult_journey_policy', '0131_adult_journey_policy.sql'],
      ['studio_ai_accounts', '0116_groovy_shriek.sql'],
      ['studio_ai_runs', '0117_absurd_jimmy_woo.sql'],
      ['studio_builder_jobs', '0120_cool_the_fallen.sql'],
      ['studio_builder_project_deletions', '0124_superb_karen_page.sql'],
    ]) {
      const [present] = await transaction`select to_regclass(${`members.${table}`}) as name`
      if (present?.name) continue
      const source = await Bun.file(
        new URL(
          `../../src/infrastructure/persistence/drizzle/migrations/${migration}`,
          import.meta.url,
        ),
      ).text()
      for (const statement of source.split('--> statement-breakpoint'))
        if (statement.trim()) await transaction.unsafe(statement)
    }
  })
  await database.unsafe(`create table if not exists members.lesson_blocks (
    id uuid primary key, lesson_id uuid not null, kind text not null,
    sort_order integer not null default 0, content jsonb not null,
    content_revision text not null default md5(random()::text), archived_at timestamptz
  )`)
  await database`alter table members.lesson_blocks add column if not exists archived_at timestamptz`
  await database`alter table members.lesson_blocks add column if not exists content_revision text not null default md5(random()::text)`
  await database.unsafe(`create table if not exists members.lesson_structures (
    lesson_id uuid primary key, revision uuid not null, sections jsonb not null
  )`)
  // A coluna `support_block_ids` saiu na migration 0091: todo bloco pertence a uma seção.
  await database`alter table members.lesson_structures drop column if exists support_block_ids`
  // Cursos ao vivo (0113): quem já criou `members.courses` neste banco compartilhado ganha a
  // modalidade antes do próximo arquivo; cada arquivo que cria a tabela também a acrescenta.
  await database.unsafe(`do $$ begin
    if to_regclass('members.courses') is not null then
      alter table members.courses add column if not exists modality text not null default 'recorded';
    end if;
  end $$`)
  await database.unsafe(`create or replace view members.active_lesson_blocks as
    select id,lesson_id,kind,sort_order,content,content_revision,archived_at from members.lesson_blocks where archived_at is null`)
}
