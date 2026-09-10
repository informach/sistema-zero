import postgres from 'postgres'

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
  await database.unsafe(`create table if not exists members.lesson_blocks (
    id uuid primary key, lesson_id uuid not null, kind text not null,
    sort_order integer not null default 0, content jsonb not null,
    content_revision text not null default md5(random()::text), archived_at timestamptz
  )`)
  await database`alter table members.lesson_blocks add column if not exists archived_at timestamptz`
  await database`alter table members.lesson_blocks add column if not exists content_revision text not null default md5(random()::text)`
  await database.unsafe(`create table if not exists members.lesson_structures (
    lesson_id uuid primary key, revision uuid not null, sections jsonb not null, support_block_ids jsonb not null default '[]'::jsonb
  )`)
  await database`alter table members.lesson_structures add column if not exists support_block_ids jsonb not null default '[]'::jsonb`
  await database.unsafe(`create or replace view members.active_lesson_blocks as
    select id,lesson_id,kind,sort_order,content,content_revision,archived_at from members.lesson_blocks where archived_at is null`)
}
