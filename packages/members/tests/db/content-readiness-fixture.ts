import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'

/** Additive union for the shared SQL test database; no production database is selected here. */
export async function prepareContentReadinessTables(conn: DbConnection): Promise<void> {
  await conn.sql`create schema if not exists members`
  const definitions: Record<string, string[]> = {
    courses: [
      'id uuid primary key',
      'version integer not null default 0',
      "slug text not null default ''",
      "title text not null default ''",
      'subtitle text',
      'description text',
      'cover_image_url text',
      "status text not null default 'draft'",
      "audience text not null default 'kids'",
      "level text not null default 'iniciante'",
      "track text not null default '2d'",
      'career_slot smallint',
      'sequential_lock boolean not null default true',
      'metadata jsonb',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ],
    modules: [
      'id uuid primary key',
      'course_id uuid',
      "title text not null default ''",
      'summary text',
      'sort_order integer not null default 0',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ],
    lessons: [
      'id uuid primary key',
      'module_id uuid',
      'course_id uuid',
      "slug text not null default ''",
      "title text not null default ''",
      'sort_order integer not null default 0',
      'estimated_minutes integer',
      'is_published boolean not null default true',
      'created_at timestamptz not null default now()',
      'updated_at timestamptz not null default now()',
    ],
    lesson_blocks: [
      'id uuid primary key',
      'lesson_id uuid',
      'kind text',
      'sort_order integer not null default 0',
      'content jsonb',
      "content_revision varchar(32) not null default 'x'",
    ],
    lesson_completions: ['user_id uuid', 'lesson_id uuid', 'course_id uuid'],
  }
  for (const [table, columns] of Object.entries(definitions)) {
    await conn.sql.unsafe(`create table if not exists members.${table} (${columns.join(', ')})`)
    for (const column of columns.slice(1)) {
      await conn.sql.unsafe(`alter table members.${table} add column if not exists ${column}`)
    }
  }
}
