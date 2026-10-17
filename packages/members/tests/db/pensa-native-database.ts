import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'

export function pensaTestTarget(name: string, raw = process.env.PENSA_TEST_DATABASE_URL): URL {
  if (!raw)
    throw new Error(
      'PENSA_TEST_DATABASE_URL must explicitly select disposable local PostgreSQL for Pensa tests',
    )
  const target = new URL(raw)
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !/^pensa_[a-z0-9_]+$/.test(target.pathname.slice(1)) ||
    !/^pensa_[a-z0-9_]+$/.test(name)
  )
    throw new Error('Pensa tests refuse a remote or non-disposable database')
  target.pathname = `/${name}`
  return target
}

const migrations = fileURLToPath(
  new URL('../../src/infrastructure/persistence/drizzle/migrations/', import.meta.url),
)

export async function openPensaTestDatabase(
  name: string,
  beforeReset = false,
  databaseUrl?: string,
) {
  const target = pensaTestTarget(name, databaseUrl)
  const adminTarget = new URL(target)
  adminTarget.pathname = '/postgres'
  const admin = postgres(adminTarget.toString(), { max: 1, onnotice: () => {} })
  try {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
    await admin.unsafe(`CREATE DATABASE "${name}"`)
  } finally {
    await admin.end()
  }
  const conn = createDbConnection(target.toString(), { max: 10 })
  const upgrade = () =>
    migrate(conn.db, { migrationsFolder: migrations, migrationsTable: 'members_migrations' })
  try {
    // Bootstrap the reviewed 0125 baseline one migration per transaction: PostgreSQL 16
    // requires historical enum additions to commit before a later migration uses them.
    // The Pensa cutover itself still runs through the production Drizzle migrator.
    const baseline = readMigrationFiles({ migrationsFolder: migrations }).slice(0, 126)
    if (baseline.length !== 126) throw new Error('The reviewed Pensa migration baseline is missing')
    await conn.sql`create schema drizzle`
    await conn.sql`create table drizzle.members_migrations (
      id serial primary key, hash text not null, created_at bigint
    )`
    for (const migration of baseline) {
      await conn.sql.begin(async (transaction) => {
        for (const statement of migration.sql)
          if (statement.trim()) await transaction.unsafe(statement)
        await transaction`insert into drizzle.members_migrations (hash, created_at)
          values (${migration.hash}, ${migration.folderMillis})`
      })
    }
    if (!beforeReset) await upgrade()
    return { ...conn, upgrade }
  } catch (error) {
    await conn.close()
    throw error
  }
}
