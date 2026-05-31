import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getEnv } from '../lib/env'
import { schema } from './schema'

export type Database = PostgresJsDatabase<typeof schema>

let _db: Database | undefined
let _client: ReturnType<typeof postgres> | undefined

/**
 * Conexão postgres.js + Drizzle (singleton, lazy). Aponta para o MESMO Postgres
 * do payments; as queries são qualificadas no schema `funil` pelo próprio Drizzle.
 */
export function getDb(): Database {
  if (!_db) {
    const env = getEnv()
    _client = postgres(env.DATABASE_URL, {
      max: env.DATABASE_POOL_MAX,
      idle_timeout: 20,
      connect_timeout: 10,
    })
    _db = drizzle(_client, { schema, casing: 'snake_case' })
  }
  return _db
}

/** Encerra o pool (shutdown / testes). */
export async function closeDb(): Promise<void> {
  if (_client) {
    await _client.end({ timeout: 5 })
    _client = undefined
    _db = undefined
  }
}
