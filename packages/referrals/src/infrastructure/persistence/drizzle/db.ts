import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

export type Database = PostgresJsDatabase<typeof schema>

export interface DbConnection {
  db: Database
  /** Client cru (postgres-js) — usado pela probe de readiness (`select 1`). */
  sql: ReturnType<typeof postgres>
  close: () => Promise<void>
}

/** Conexão postgres-js com timeouts no servidor (mesmo padrão do catalog/members/fiscal). */
export function createDbConnection(
  connectionString: string,
  opts: {
    max?: number
    idleTimeoutSeconds?: number
    connectTimeoutSeconds?: number
    statementTimeoutMs?: number
    idleInTransactionTimeoutMs?: number
  } = {},
): DbConnection {
  const client = postgres(connectionString, {
    max: opts.max ?? 10,
    idle_timeout: opts.idleTimeoutSeconds ?? 20,
    connect_timeout: opts.connectTimeoutSeconds ?? 10,
    connection: {
      statement_timeout: opts.statementTimeoutMs ?? 30_000,
      idle_in_transaction_session_timeout: opts.idleInTransactionTimeoutMs ?? 30_000,
    },
  })

  const db = drizzle(client, { schema, casing: 'snake_case' })

  return {
    db,
    sql: client,
    close: () => client.end({ timeout: 5 }),
  }
}
