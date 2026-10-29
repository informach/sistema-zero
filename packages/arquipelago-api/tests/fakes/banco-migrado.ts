import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'

/** Prepara as tabelas reais no banco descartável já validado pelo teste chamador. */
export async function migrarBancoDeTeste(db: DbConnection): Promise<void> {
  await migrate(db.db, {
    migrationsFolder: path.join(
      import.meta.dir,
      '../../src/infrastructure/persistence/drizzle/migrations',
    ),
    migrationsTable: 'arquipelago_migrations',
  })
}
