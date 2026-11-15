/**
 * A troca do avatar antigo pelo do pack, uma vez por ambiente (ver
 * `src/infrastructure/persistence/drizzle/avatar-swap.ts` para as regras).
 *
 *   bun scripts/swap-avatar.ts [--banco <arquivo.json>] [--confirm]
 *
 * Sem `--confirm` é DRY-RUN: mostra quantas moedas voltam, quantas peças antigas saem do
 * inventário e quantos avatares trocam, sem escrever. O banco (`scripts/avatar-swap-bank.json`,
 * padrão) tem, para cada sorteado, a foto (gerada antes por `member-shell/qa/avatar-banco-client.tsx`
 * e enviada ao bucket público) e as peças com que ela foi tirada. ⚠️ Se o catálogo de agora sortear
 * outra coisa para algum índice (a arte mudou as peças grátis), a troca NÃO roda: a foto não
 * mostraria o avatar. Gere o banco de novo.
 * Rodar de novo é seguro: a devolução tem chave única e o avatar já trocado fica como está.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  AVATAR_SWAP_BANK,
  bankAvatar,
  swapAvatars,
} from '../src/infrastructure/persistence/drizzle/avatar-swap'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

function argument(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')
const confirm = process.argv.includes('--confirm')
const arquivo = argument('--banco') ?? resolve(import.meta.dir, 'avatar-swap-bank.json')
const banco = JSON.parse(readFileSync(resolve(arquivo), 'utf8')) as Record<
  string,
  { foto: string; slots: Record<string, string> }
>
const photos = new Map<number, string>()
const fora: number[] = []
for (let i = 0; i < AVATAR_SWAP_BANK; i++) {
  const item = banco[String(i)]
  if (!item || JSON.stringify(item.slots) !== JSON.stringify(bankAvatar(i).slots)) fora.push(i)
  else photos.set(i, item.foto)
}
if (fora.length > 0)
  throw new Error(
    `O banco de fotos não confere com o catálogo de agora em ${fora.length} sorteado(s) (${fora.slice(0, 10).join(', ')}). Gere o banco de novo.`,
  )

const connection = createDbConnection(databaseUrl, { max: 1 })
try {
  const r = await swapAvatars(connection.sql, { dryRun: !confirm, now: new Date(), photos })
  const moedas = r.refunds.reduce((s, x) => s + x.coins, 0)
  console.log(`[swap-avatar] ${r.dryRun ? 'DRY-RUN' : 'APLICADO'}`)
  console.log(`  moedas devolvidas: ${moedas} para ${r.refunds.length} perfil(is)`)
  console.log(`  peças antigas tiradas do inventário: ${r.inventoryRemoved}`)
  console.log(`  avatares trocados: ${r.avatarsSwapped} (com foto)`)
} finally {
  await connection.close()
}
