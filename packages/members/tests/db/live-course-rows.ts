import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import type { TransactionSql } from 'postgres'
import type { LiveCourseRecord } from '../../src/domain/ports/live-course.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { courses, lessons, modules } from '../../src/infrastructure/persistence/drizzle/schema'

/**
 * The shared test database keeps whatever another file created first: every column the
 * adapters read is added here, NULLABLE and without default (the most permissive shape, so no
 * other file's insert breaks), enums as text. The real migrations are not replayed.
 */
type Sql = TransactionSql

async function ensureTable(sql: Sql, table: PgTable) {
  const { name, columns } = getTableConfig(table)
  const [found] = await sql`select to_regclass(${`members.${name}`}) as name`
  if (!found?.name)
    await sql.unsafe(`create table if not exists members.${name} (id uuid primary key)`)
  const existing = new Set(
    (
      await sql`
        select column_name from information_schema.columns
        where table_schema = 'members' and table_name = ${name}`
    ).map((row) => row.column_name as string),
  )
  for (const column of columns) {
    if (existing.has(column.name)) continue
    const type = column.columnType === 'PgEnumColumn' ? 'text' : column.getSQLType()
    await sql.unsafe(
      `alter table members.${name} add column if not exists "${column.name}" ${type}`,
    )
  }
}

export async function ensureCourseTables(connection: DbConnection) {
  await connection.sql.begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(1432014, 110)`
    for (const table of [courses, modules, lessons]) await ensureTable(sql, table)
  })
}

const ready = new WeakMap<DbConnection, Promise<void>>()

/**
 * The course row a cohort locks when it is created (`select … for update` on `courses`): the
 * in-memory course port of the live tests persists each course here on its first read.
 */
export async function persistLiveCourse(connection: DbConnection, course: LiveCourseRecord) {
  let tables = ready.get(connection)
  if (!tables) {
    tables = ensureCourseTables(connection)
    ready.set(connection, tables)
  }
  await tables
  await connection.sql`
    insert into members.courses
      (id, version, slug, title, status, audience, level, track, journey_role, sequential_lock,
       video_before_activity, metadata, created_at, updated_at)
    values
      (${course.id}, 0, ${course.slug}, ${course.title}, ${course.status}, ${course.audience},
       'iniciante', '2d', 'reward', false, false,
       ${JSON.stringify({ modality: course.modality })}::jsonb, now(), now())
    on conflict (id) do nothing`
  // When the `modality` column exists (course side, migration 0113) it is the authority.
  const [column] = await connection.sql`
    select 1 from information_schema.columns
    where table_schema = 'members' and table_name = 'courses' and column_name = 'modality'`
  if (column)
    await connection.sql.unsafe('update members.courses set modality = $1 where id = $2', [
      course.modality,
      course.id,
    ])
}
