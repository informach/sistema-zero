import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import postgres from 'postgres'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'

/** Bun deadlines do not cancel async work. Drain only this harness's work before another reset. */
export class OwnedKidsJourneyTestWork {
  private readonly pending = new Set<Promise<unknown>>()

  track<T>(operation: () => Promise<T>): Promise<T> {
    // Enqueue before awaiting: a timed-out hook must not leave an untracked drain continuation.
    const previous = [...this.pending]
    const work = Promise.allSettled(previous).then(operation)
    this.pending.add(work)
    // Observe late rejection even if Bun has already reported the deadline; the original still rejects.
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

export function kidsJourneyTestTarget(raw: string): URL {
  const target = new URL(raw)
  if (
    !['postgres:', 'postgresql:'].includes(target.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
    !/^kids_journey_[a-z0-9_]+$/.test(target.pathname.slice(1))
  )
    throw new Error(
      'KIDS_JOURNEY_TEST_DATABASE_URL must select an explicitly disposable local kids_journey_* database',
    )
  return target
}

/** Additive real migration history, one transaction per historical enum boundary. No reset/drop. */
export async function openKidsJourneyTestDatabase(raw: string) {
  const target = kidsJourneyTestTarget(raw)
  const name = target.pathname.slice(1)
  const adminTarget = new URL(target)
  adminTarget.pathname = '/postgres'
  const admin = postgres(adminTarget.toString(), { max: 1, onnotice: () => {} })
  try {
    const [clients] =
      await admin`select count(*)::int as count from pg_stat_activity where datname = ${name}`
    if (Number(clients?.count ?? 0) > 0)
      throw new Error(`Refusing to reuse disposable ${name}: another database client is connected`)
    const [present] = await admin`select 1 from pg_database where datname = ${name}`
    if (!present) await admin.unsafe(`create database "${name}"`)
  } finally {
    await admin.end()
  }
  const connection = createDbConnection(target.toString(), { max: 6 })
  try {
    await connection.sql`create schema if not exists drizzle`
    await connection.sql`create table if not exists drizzle.members_migrations (
      id serial primary key, hash text not null, created_at bigint
    )`
    const applied = await connection.sql<
      { hash: string; created_at: string }[]
    >`select hash, created_at from drizzle.members_migrations`
    const byTime = new Map(applied.map((row) => [Number(row.created_at), row.hash]))
    for (const migration of readMigrationFiles({
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
      ),
    })) {
      if (byTime.has(migration.folderMillis)) {
        if (byTime.get(migration.folderMillis) !== migration.hash)
          throw new Error('Kids journey test migration history diverged')
        continue
      }
      await connection.sql.begin(async (tx) => {
        for (const statement of migration.sql) if (statement.trim()) await tx.unsafe(statement)
        await tx`insert into drizzle.members_migrations(hash,created_at) values (${migration.hash},${migration.folderMillis})`
      })
    }
    return connection
  } catch (error) {
    await connection.close()
    throw error
  }
}
