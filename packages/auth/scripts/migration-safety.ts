import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const IDENTIFIER = '(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)'
const QUALIFIED_TABLE = `(?:${IDENTIFIER}\\.)?${IDENTIFIER}`
const HISTORICAL_CUTOFF = 17
const MIGRATIONS_DIR = fileURLToPath(
  new URL('../src/infrastructure/persistence/drizzle/migrations/', import.meta.url),
)

/** Número inicial de `0018_nome.sql`; nomes fora da convenção retornam null. */
function migrationNumber(filename: string): number | null {
  const match = filename.match(/^(\d{4})_/)
  return match ? Number(match[1]) : null
}

/**
 * Lista tabelas existentes que receberiam `CREATE INDEX` dentro da migration
 * transacional padrão do Drizzle. PostgreSQL pode bloquear escritas nesse caso;
 * `CONCURRENTLY` também não é aceito aqui porque não pode rodar em transação.
 * Índices de tabelas criadas no próprio arquivo são seguros antes do tráfego.
 */
export function findBlockingIndexesOnExistingTables(sql: string): string[] {
  const createdTables = new Set<string>()
  const createTable = new RegExp(
    `\\bCREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(${QUALIFIED_TABLE})`,
    'gi',
  )
  for (const match of sql.matchAll(createTable)) {
    const table = match[1]
    if (table) createdTables.add(normalizeTable(table))
  }

  const existingTables = new Set<string>()
  const createIndex = new RegExp(
    `\\bCREATE\\s+(?:UNIQUE\\s+)?INDEX\\s+(?:CONCURRENTLY\\s+)?(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENTIFIER}\\s+ON\\s+(?:ONLY\\s+)?(${QUALIFIED_TABLE})`,
    'gi',
  )
  for (const match of sql.matchAll(createIndex)) {
    const rawTable = match[1]
    if (!rawTable) continue
    const table = normalizeTable(rawTable)
    if (!createdTables.has(table)) existingTables.add(table)
  }
  return [...existingTables]
}

export function findMigrationSafetyViolations(directory = MIGRATIONS_DIR): string[] {
  const violations: string[] = []
  for (const file of readdirSync(directory).filter((name) => name.endsWith('.sql'))) {
    const number = migrationNumber(file)
    if (number === null || number <= HISTORICAL_CUTOFF) continue
    const tables = findBlockingIndexesOnExistingTables(readFileSync(join(directory, file), 'utf8'))
    for (const table of tables) violations.push(`${file}: ${table}`)
  }
  return violations
}

function normalizeTable(identifier: string): string {
  const last = identifier.split('.').at(-1) ?? identifier
  return last.replace(/^"|"$/g, '').toLowerCase()
}

if (import.meta.main) {
  const violations = findMigrationSafetyViolations()
  if (violations.length > 0) {
    throw new Error(
      `CREATE INDEX em tabela ativa deve usar o fluxo operacional fora do Drizzle:\n${violations.join('\n')}`,
    )
  }
  console.log('Migrations de índices seguras.')
}
