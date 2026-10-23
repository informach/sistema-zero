import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

/** Only the isolated review stack may initialize these two schema journals. */
export async function migrateReviewDatabase(url: string) {
  const target = new URL(url)
  if (
    target.protocol !== 'postgres:' ||
    target.hostname !== '127.0.0.1' ||
    target.port !== '15440' ||
    target.pathname !== '/marketing_review' ||
    target.search ||
    target.hash
  )
    throw new Error('Migração restrita ao banco local de revisão')
  const connection = createDbConnection(url)
  try {
    for (const name of ['auth', 'marketing'])
      await migrate(connection.db, {
        migrationsFolder: path.resolve(
          import.meta.dir,
          `../../${name}/src/infrastructure/persistence/drizzle/migrations`,
        ),
        migrationsTable: `${name}_migrations`,
      })
  } finally {
    await connection.close()
  }
}
