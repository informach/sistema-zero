import postgres from 'postgres'

const DEFAULT_TEST_DB_NAME = 'sistemazero_test'
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5433/sistemazero'

function withDatabase(url: string, dbName: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

/**
 * Descobre o Postgres local opcional ou valida o banco explicitamente contratado
 * pelo CI. `TEST_DATABASE_URL` definida é promessa de infra e nunca vira skip.
 */
export async function prepareTestDatabase(
  dbName: string = DEFAULT_TEST_DB_NAME,
): Promise<string | null> {
  const override = process.env.TEST_DATABASE_URL
  if (override !== undefined && override.trim() === '') {
    throw new Error('TEST_DATABASE_URL foi definida, mas está vazia.')
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
    throw new Error(`Nome de banco de teste inválido: ${dbName}`)
  }

  const baseUrl = override ?? process.env.DATABASE_URL ?? FALLBACK_URL
  const admin = postgres(baseUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await admin`select 1`
    if (override !== undefined) return override
    try {
      await admin.unsafe(`CREATE DATABASE ${dbName}`)
    } catch (error) {
      if ((error as { code?: string }).code !== '42P04') throw error
    }
    return withDatabase(baseUrl, dbName)
  } catch (error) {
    if (override !== undefined) {
      throw new Error('TEST_DATABASE_URL está definida, mas o Postgres não está utilizável.', {
        cause: error,
      })
    }
    return null
  } finally {
    await admin.end({ timeout: 1 })
  }
}
