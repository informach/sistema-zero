import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core'
import type { TransactionSql } from 'postgres'
import type {
  LiveCourseRecord,
  LiveStudioBlockRecord,
} from '../../src/domain/ports/live-course.port'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { courses, lessons, modules } from '../../src/infrastructure/persistence/drizzle/schema'
import { studioMigrationTableStatements } from './studio-migration-tables'

/**
 * The shared test database keeps whatever another file created first: every column the
 * adapters read is added here, NULLABLE and without default (the most permissive shape, so no
 * other file's insert breaks), enums as text. The new baseline tables use their actual
 * migration, including foreign keys; only the pre-existing authoring parents are sparse.
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
    const [baseline] = await sql`select to_regclass('members.studio_lesson_baselines') as name`
    if (!baseline?.name) {
      for (const statement of await studioMigrationTableStatements([
        'studio_lesson_baselines',
        'studio_lesson_bindings',
      ]))
        await sql.unsafe(statement)
    }
  })
}

const ready = new WeakMap<DbConnection, Promise<void>>()

/**
 * The course row a cohort locks when it is created (`select … for update` on `courses`): the
 * in-memory course port of the live tests persists each course here on its first read.
 */
export async function persistLiveCourse(
  connection: DbConnection,
  course: LiveCourseRecord,
  blocks: readonly LiveStudioBlockRecord[],
) {
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
  await connection.sql`
    insert into members.modules (id, course_id, title, sort_order, created_at, updated_at)
    values (${course.id}, ${course.id}, 'Oficina', 0, now(), now())
    on conflict (id) do nothing`
  for (const [order, lesson] of course.lessons.entries())
    await connection.sql`
      insert into members.lessons
        (id, module_id, course_id, slug, title, sort_order, is_published, created_at, updated_at)
      values (${lesson.id}, ${course.id}, ${course.id}, ${`encontro-${lesson.id}`}, ${lesson.title},
        ${order}, true, now(), now())
      on conflict (id) do nothing`
  const blockOrder = new Map<string, number>()
  for (const block of blocks) {
    const order = blockOrder.get(block.lessonId) ?? 0
    blockOrder.set(block.lessonId, order + 1)
    await connection.sql`
      insert into members.lesson_blocks (id, lesson_id, kind, sort_order, content)
      values (${block.blockId}, ${block.lessonId}, 'studio', ${order},
        ${JSON.stringify({ ...block.studio, initialProject: block.initialProject, chain: block.chain })}::jsonb)
      on conflict (id) do update set content = excluded.content`
  }
}
