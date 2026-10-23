import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'

/** Real migration history, restricted to the explicitly dedicated local review database. */
export async function openStudioReviewDatabase(url: string) {
  const target = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(target.hostname) ||
    target.pathname !== '/studio_pro_review'
  )
    throw new Error('Disposable local studio_pro_review database required.')
  const connection = createDbConnection(url, { max: 8 })
  try {
    // Historical enum additions must commit before later migrations use their new values.
    await connection.sql`create schema if not exists drizzle`
    await connection.sql`create table if not exists drizzle.studio_review_migrations (
      id serial primary key, hash text not null, created_at bigint
    )`
    const [last] =
      await connection.sql`select max(created_at) as value from drizzle.studio_review_migrations`
    for (const migration of readMigrationFiles({
      migrationsFolder: fileURLToPath(
        new URL('../../src/infrastructure/persistence/drizzle/migrations', import.meta.url),
      ),
    })) {
      if (migration.folderMillis <= Number(last?.value ?? 0)) continue
      await connection.sql.begin(async (tx) => {
        for (const statement of migration.sql) if (statement.trim()) await tx.unsafe(statement)
        await tx`insert into drizzle.studio_review_migrations(hash,created_at) values (${migration.hash},${migration.folderMillis})`
      })
    }
    return connection
  } catch (error) {
    await connection.close()
    throw error
  }
}
