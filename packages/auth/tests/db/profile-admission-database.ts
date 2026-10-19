import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import postgres from 'postgres'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'

export function profileAdmissionTestTarget(raw: string): URL {
  const target = new URL(raw)
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !/^kids_journey_auth_[a-z0-9_]+$/.test(target.pathname.slice(1))
  )
    throw new Error(
      'PROFILE_ADMISSION_TEST_DATABASE_URL must select an explicitly disposable local kids_journey_auth_* database',
    )
  return target
}

/** Fresh target proves expand/default migrations with actual pre-existing profiles. Never DROP/force. */
export async function openProfileAdmissionTestDatabase(
  raw: string,
  beforeExpansion: (connection: DbConnection) => Promise<void>,
): Promise<DbConnection> {
  const target = profileAdmissionTestTarget(raw)
  const name = target.pathname.slice(1)
  const adminTarget = new URL(target)
  adminTarget.pathname = '/postgres'
  const admin = postgres(adminTarget.toString(), { max: 1, onnotice: () => {} })
  try {
    const [clients] =
      await admin`select count(*)::int as count from pg_stat_activity where datname=${name}`
    if (Number(clients?.count ?? 0) > 0)
      throw new Error('Another client is connected to the Auth admission QA target')
    const [present] = await admin`select 1 from pg_database where datname=${name}`
    if (present)
      throw new Error(
        'Auth admission expansion proof requires a NEW QA target; previous history is preserved',
      )
    await admin.unsafe(`create database "${name}"`)
  } finally {
    await admin.end()
  }
  const connection = createDbConnection(target.toString(), { max: 6 })
  try {
    await connection.sql`create schema drizzle`
    await connection.sql`create table drizzle.auth_migrations(id serial primary key,hash text not null,created_at bigint)`
    const migrations = readMigrationFiles({
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
      ),
    })
    let expanded = false
    for (const [index, migration] of migrations.entries()) {
      if (index === 23) {
        await beforeExpansion(connection)
        expanded = true
      }
      await connection.sql.begin(async (tx) => {
        for (const statement of migration.sql) if (statement.trim()) await tx.unsafe(statement)
        await tx`insert into drizzle.auth_migrations(hash,created_at) values (${migration.hash},${migration.folderMillis})`
      })
    }
    if (!expanded) throw new Error('Auth admission expand migration was not exercised')
    return connection
  } catch (error) {
    await connection.close()
    throw error
  }
}

/** Timed-out Bun hooks do not cancel work; queue all owned work before another reset/close. */
export class OwnedProfileAdmissionTestWork {
  private readonly pending = new Set<Promise<unknown>>()
  track<T>(operation: () => Promise<T>): Promise<T> {
    const work = Promise.allSettled([...this.pending]).then(operation)
    this.pending.add(work)
    void work.then(
      () => this.pending.delete(work),
      () => this.pending.delete(work),
    )
    return work
  }
  async drain(): Promise<void> {
    while (this.pending.size) await Promise.allSettled([...this.pending])
  }
}
