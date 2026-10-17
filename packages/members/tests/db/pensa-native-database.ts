import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'

export function pensaTestTarget(name: string): URL {
  const raw = process.env.PENSA_TEST_DATABASE_URL
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

export async function openPensaTestDatabase(name: string, beforeReset = false) {
  const target = pensaTestTarget(name)
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
  let migrationFolder = migrations
  if (beforeReset) {
    const journal = JSON.parse(await readFile(join(migrations, 'meta', '_journal.json'), 'utf8'))
    journal.entries = journal.entries.filter((e: { idx: number }) => e.idx < 126)
    migrationFolder = await mkdtemp(join(tmpdir(), 'pensa-migration-baseline-'))
    await mkdir(join(migrationFolder, 'meta'))
    await writeFile(join(migrationFolder, 'meta', '_journal.json'), JSON.stringify(journal))
    for (const entry of journal.entries)
      await copyFile(
        join(migrations, `${entry.tag}.sql`),
        join(migrationFolder, `${entry.tag}.sql`),
      )
  }
  await migrate(conn.db, {
    migrationsFolder: migrationFolder,
    migrationsTable: 'members_migrations',
  })
  return {
    ...conn,
    upgrade: () =>
      migrate(conn.db, { migrationsFolder: migrations, migrationsTable: 'members_migrations' }),
  }
}
