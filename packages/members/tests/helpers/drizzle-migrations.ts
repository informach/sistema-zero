import { existsSync, readFileSync } from 'node:fs'

/**
 * Acesso às migrations do drizzle SEM fixar número, para os guardas não apodrecerem em silêncio.
 *
 * ⚠️⚠️ O PORQUÊ: os testes do CHECK das posições da carreira importavam
 * `meta/0063_snapshot.json` por caminho LITERAL. Quando a `0064` alargou a restrição, os dois
 * continuariam validando a regra ANTIGA — e **passando**, porque a regra velha segue coerente
 * consigo mesma. Um guarda que para de guardar sem ficar vermelho é pior que nenhum guarda: ele
 * dá confiança falsa. (Mesma lição do `copy-scan`, que assere ter LIDO arquivos.)
 *
 * O snapshot mais recente é sempre o estado atual do schema; a última migration que MENCIONA um
 * objeto é sempre quem o escreveu por último. Os dois juntos dizem a verdade sem ninguém precisar
 * lembrar de atualizar um número.
 */

const MIGRATIONS_DIR = new URL(
  '../../src/infrastructure/persistence/drizzle/migrations/',
  import.meta.url,
)

interface JournalEntry {
  idx: number
  tag: string
  when: number
}

interface DrizzleSnapshot {
  tables: Record<
    string,
    { checkConstraints?: Record<string, { name: string; value: string }> } | undefined
  >
}

function readJson<T>(url: URL): T {
  return JSON.parse(readFileSync(url, 'utf8')) as T
}

function journalEntries(): JournalEntry[] {
  const journal = readJson<{ entries: JournalEntry[] }>(
    new URL('meta/_journal.json', MIGRATIONS_DIR),
  )
  if (journal.entries.length === 0) throw new Error('journal de migrations vazio')
  return journal.entries
}

/**
 * O snapshot mais recente que EXISTE — o retrato do schema como o drizzle o conhece.
 *
 * ⚠️ Não é "o snapshot da última migration": **9 das 65 entradas do journal não têm snapshot**,
 * porque migração escrita à mão (o padrão daqui para `ALTER TYPE ... ADD VALUE`) não passa pelo
 * `db:generate`. Ler direto o índice da última entrada estoura com ENOENT na próxima migração
 * manual e derruba todos os testes que usam este helper — um estrago barulhento, mas ainda assim
 * um estrago que eu teria plantado.
 *
 * ⭐ Andar para trás também dá um sinal ÚTIL de graça: se alguém mexer num CHECK à mão sem
 * regenerar o snapshot (foi o que a `0053` fez), o contrato passa a comparar o SQL manual com o
 * snapshot velho e FALHA — que é exatamente o drift que se quer ver.
 */
export function latestSnapshot(): DrizzleSnapshot {
  for (const entry of [...journalEntries()].reverse()) {
    const file = new URL(`meta/${String(entry.idx).padStart(4, '0')}_snapshot.json`, MIGRATIONS_DIR)
    if (existsSync(file)) return readJson<DrizzleSnapshot>(file)
  }
  throw new Error('nenhum snapshot do drizzle encontrado')
}

/** O valor de um CHECK no snapshot atual. Falha alto se o CHECK sumiu do schema. */
export function latestCheckConstraint(table: string, constraint: string): string {
  const value = latestSnapshot().tables[table]?.checkConstraints?.[constraint]?.value
  if (!value) throw new Error(`CHECK ${constraint} não existe em ${table} no snapshot atual`)
  return value
}

/**
 * A ÚLTIMA migration que menciona `needle` — quem escreveu aquele objeto por último.
 *
 * ⚠️ Não é "a última migration": migração nova que não toca o objeto não pode fazer o teste
 * falhar sem motivo.
 */
export function lastMigrationTouching(needle: string): { tag: string; sql: string } {
  for (const entry of [...journalEntries()].reverse()) {
    const sql = readFileSync(new URL(`${entry.tag}.sql`, MIGRATIONS_DIR), 'utf8')
    if (sql.includes(needle)) return { tag: entry.tag, sql }
  }
  throw new Error(`nenhuma migration menciona ${needle}`)
}

/** Uma migration específica, para asserções que são legitimamente sobre ELA. */
export function migrationSql(tag: string): string {
  return readFileSync(new URL(`${tag}.sql`, MIGRATIONS_DIR), 'utf8')
}
