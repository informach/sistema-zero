/**
 * A troca do avatar antigo pelo do pack, uma vez por ambiente (ver
 * `src/infrastructure/persistence/drizzle/avatar-swap.ts` para as regras).
 *
 *   bun scripts/swap-avatar.ts [--fotos <fotos.json>] [--confirm]
 *
 * Sem `--confirm` é DRY-RUN: mostra quantas moedas voltam, quantas peças antigas saem do
 * inventário e quantos avatares trocam, sem escrever. `--fotos` é um JSON `{ "<índice>": "<url>" }`
 * com a foto de cada avatar do banco (gerada antes); sem ele, a foto antiga sai.
 * Rodar de novo é seguro: a devolução tem chave única e o avatar já trocado fica como está.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { swapAvatars } from '../src/infrastructure/persistence/drizzle/avatar-swap'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')
const confirm = process.argv.includes('--confirm')
const fotosArquivo = argument('--fotos')
const photos = fotosArquivo
  ? new Map(
      Object.entries(
        JSON.parse(readFileSync(resolve(fotosArquivo), 'utf8')) as Record<string, string>,
      ).map(([indice, url]) => [Number(indice), url] as const),
    )
  : undefined

const connection = createDbConnection(databaseUrl, { max: 1 })
try {
  const r = await swapAvatars(connection.sql, { dryRun: !confirm, now: new Date(), photos })
  const moedas = r.refunds.reduce((s, x) => s + x.coins, 0)
  console.log(`[swap-avatar] ${r.dryRun ? 'DRY-RUN' : 'APLICADO'}`)
  console.log(`  moedas devolvidas: ${moedas} para ${r.refunds.length} perfil(is)`)
  console.log(`  peças antigas tiradas do inventário: ${r.inventoryRemoved}`)
  console.log(`  avatares trocados: ${r.avatarsSwapped}${photos ? ' (com foto)' : ' (sem foto)'}`)
} finally {
  await connection.close()
}
