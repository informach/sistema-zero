import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

export type Database = PostgresJsDatabase<typeof schema>

/** Cliente postgres.js cru — usado pelo probe de readiness e pelos advisory locks. */
export type PgClient = ReturnType<typeof postgres>

export interface DbConnection {
  db: Database
  sql: PgClient
  close: () => Promise<void>
}

/** Conexão PostgreSQL via postgres-js (rápido e compatível com Bun). */
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
  const statementTimeoutMs = opts.statementTimeoutMs ?? 30_000
  const idleInTransactionTimeoutMs = opts.idleInTransactionTimeoutMs ?? 30_000

  const client = postgres(connectionString, {
    max: opts.max ?? 10,
    idle_timeout: opts.idleTimeoutSeconds ?? 20,
    connect_timeout: opts.connectTimeoutSeconds ?? 10,
    connection: {
      statement_timeout: statementTimeoutMs,
      idle_in_transaction_session_timeout: idleInTransactionTimeoutMs,
    },
  })

  const db = drizzle(client, { schema, casing: 'snake_case' })

  return {
    db,
    sql: client,
    close: () => client.end({ timeout: 5 }),
  }
}
