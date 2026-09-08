import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'

export async function preparePracticeTables(conn: DbConnection) {
  await conn.sql`create schema if not exists members`
  const ddl = await Bun.file(
    new URL(
      '../../src/infrastructure/persistence/drizzle/migrations/0076_creator_practice.sql',
      import.meta.url,
    ),
  ).text()
  for (const statement of ddl.split('--> statement-breakpoint')) {
    await conn.sql.unsafe(
      statement
        .replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ')
        .replace('CREATE INDEX ', 'CREATE INDEX IF NOT EXISTS '),
    )
  }
  await conn.sql`create table if not exists members.account_deletion_fences(account_id uuid primary key, created_at timestamptz not null)`
}
