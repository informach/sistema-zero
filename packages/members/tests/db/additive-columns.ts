import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'

/**
 * Banco compartilhado: `add column if not exists` vira no-op quando outro arquivo já criou a
 * coluna, e o `live-course-rows.ts` cria `courses`/`modules`/`lessons` sem default. Quem conta
 * com um default o reaplica aqui, seja qual for a ordem dos arquivos.
 */
export async function addColumnsWithDefaults(
  conn: DbConnection,
  table: string,
  columns: readonly string[],
): Promise<void> {
  for (const column of columns) {
    await conn.sql.unsafe(`alter table members.${table} add column if not exists ${column}`)
    const match = /^(\w+)\s.*?\sdefault\s(.+)$/i.exec(column)
    if (match)
      await conn.sql.unsafe(
        `alter table members.${table} alter column ${match[1]} set default ${match[2]}`,
      )
  }
}
