import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { schema } from './schema'

export type Database = PostgresJsDatabase<typeof schema>

/** Cliente postgres.js cru — expõe `listen()` (não disponível no handle Drizzle). */
export type PgClient = ReturnType<typeof postgres>

export interface DbConnection {
  db: Database
  /** Usado para `LISTEN/NOTIFY` (abre uma conexão dedicada, fora do pool). */
  sql: PgClient
  close: () => Promise<void>
}

/**
 * Cria a conexão com PostgreSQL via postgres-js (driver rápido e compatível com
 * Bun). O pool é dimensionado por `max`. `close` encerra o pool no shutdown.
 */
export function createDbConnection(
  connectionString: string,
  opts: {
    max?: number
    /** Fecha conexões ociosas após N segundos. */
    idleTimeoutSeconds?: number
    /** Aborta a tentativa de conexão após N segundos. */
    connectTimeoutSeconds?: number
    /** Aborta um statement que passar de N ms (evita query pendurada segurando lock). */
    statementTimeoutMs?: number
    /** Aborta transação ociosa-em-aberto após N ms (devolve a conexão ao pool). */
    idleInTransactionTimeoutMs?: number
  } = {},
): DbConnection {
  const statementTimeoutMs = opts.statementTimeoutMs ?? 30_000
  const idleInTransactionTimeoutMs = opts.idleInTransactionTimeoutMs ?? 30_000

  const client = postgres(connectionString, {
    max: opts.max ?? 10,
    idle_timeout: opts.idleTimeoutSeconds ?? 20,
    connect_timeout: opts.connectTimeoutSeconds ?? 10,
    // Timeouts no lado do servidor: uma query/tx travada não segura a conexão
    // (e o lock) indefinidamente — protege o pool contra exaustão/starvation.
    connection: {
      statement_timeout: statementTimeoutMs,
      idle_in_transaction_session_timeout: idleInTransactionTimeoutMs,
    },
    // Mantém `bigint` como bigint do JS no retorno (alinhado ao domínio).
    types: {
      bigint: postgres.BigInt,
    },
  })

  const db = drizzle(client, { schema, casing: 'snake_case' })

  return {
    db,
    sql: client,
    close: () => client.end({ timeout: 5 }),
  }
}
