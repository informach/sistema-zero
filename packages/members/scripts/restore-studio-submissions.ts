/**
 * Restaura entregas de Estúdio/Pinta apagadas a partir de um MANIFESTO JSON (ver
 * `src/infrastructure/persistence/drizzle/studio-submission-restore.ts` para as regras).
 *
 *   bun scripts/restore-studio-submissions.ts --manifest <arquivo.json> [--confirm]
 *
 * Sem `--confirm` é DRY-RUN: valida tudo e mostra o que seria inserido/pulado, sem escrever.
 * O manifesto é um array de itens `{ userId, blockId, submittedAt, accountId?, passedAt?,
 * message?, source?, project? | projectFile? }` — `projectFile` é um caminho (relativo ao próprio
 * manifesto) para o JSON do projeto, para não embutir dezenas de KB por item.
 */
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import {
  type RestoreSubmissionItem,
  restoreStudioSubmissions,
} from '../src/infrastructure/persistence/drizzle/studio-submission-restore'

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const manifestPath = argument('--manifest')
if (!manifestPath) throw new Error('Passe --manifest <arquivo.json>')
const confirm = process.argv.includes('--confirm')

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')

type ManifestItem = Omit<RestoreSubmissionItem, 'project'> & {
  project?: unknown
  projectFile?: string
}

const manifestFile = resolve(manifestPath)
const raw = JSON.parse(readFileSync(manifestFile, 'utf8')) as unknown
if (!Array.isArray(raw)) throw new Error('O manifesto precisa ser um array JSON')
const items: RestoreSubmissionItem[] = (raw as ManifestItem[]).map((entry) => {
  const project =
    entry.project ??
    (entry.projectFile
      ? (JSON.parse(
          readFileSync(resolve(dirname(manifestFile), entry.projectFile), 'utf8'),
        ) as unknown)
      : undefined)
  return { ...entry, project }
})

const connection = createDbConnection(databaseUrl, { max: 1 })
try {
  const result = await restoreStudioSubmissions(connection.sql, items, {
    dryRun: !confirm,
    newId: randomUUID,
  })
  console.log(
    `[restore-submissions] ${result.dryRun ? 'DRY-RUN' : 'APLICADO'}: ${result.inserted.length} inserida(s), ${result.skipped.length} pulada(s)`,
  )
  for (const r of result.inserted) console.log(`  + ${r.userId} ${r.blockId} (${r.source ?? '?'})`)
  for (const r of result.skipped)
    console.log(`  - ${r.userId} ${r.blockId} (${r.source ?? '?'}): ${r.reason}`)
} finally {
  await connection.close()
}
