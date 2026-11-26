/**
 * O vão de cada janela e porta, como a ARTE o desenhou (26/11/2026): `vao.peca` e `vao.indice` de
 * `portas_janelas.json` (janelas e portas) e de `construcao.json` (os encaixes dos pacotes). A
 * moldura passa do vão (o óculo de 0,9 m vai no vão de 0,6 m da `janela_quadrada_1m`; a janela
 * quadrada de Natal, de 1,5 m, no de 1,2 m da `janela_2m`), então medir só o tamanho erra o par.
 * Só lê os dois JSON: não abre GLB nem escreve recurso privado.
 *
 *   bun --no-env-file scripts/morada/encaixes.ts          # grava o arquivo gerado
 *   bun --no-env-file scripts/morada/encaixes.ts --check  # confere (falha se mudou)
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { MORADA_CATALOG } from '../../packages/core/src/morada/catalog.generated'

const root = resolve(import.meta.dirname, '../..')
const source = resolve(process.env.ARTES_3D_DIR ?? join(root, '../artes-3d'))
const base = join(source, 'biblioteca/construcao')
const target = join(root, 'packages/core/src/morada/encaixes.generated.ts')

const Entry = z.object({
  id: z.string(),
  vao: z.object({ peca: z.string(), indice: z.number().int().nonnegative() }).optional(),
})
const Group = z.array(z.unknown())
const read = async (file: string) =>
  z.record(z.string(), z.unknown()).parse(JSON.parse(await readFile(join(base, file), 'utf8')))

const fittings = await read('portas_janelas.json')
const construction = await read('construcao.json')
const entries = [
  ...Group.parse(fittings.janelas ?? []),
  ...Group.parse(fittings.portas ?? []),
  ...Group.parse(construction.encaixes ?? []),
].flatMap((raw) => {
  const parsed = Entry.safeParse(raw)
  return parsed.success && parsed.data.vao ? [parsed.data] : []
})

const table: Record<string, { wall: string; index: number }> = {}
for (const { id, vao } of entries.sort((a, b) => a.id.localeCompare(b.id))) {
  if (!vao) continue
  const insert = `construcao/${id}`
  const wall = `construcao/${vao.peca}`
  // Só entra o par que o catálogo importado tem: peça fora do catálogo não abre vão nenhum.
  if (!MORADA_CATALOG.pieces[insert] || !MORADA_CATALOG.pieces[wall]) continue
  if (table[insert]) throw new Error(`Encaixe repetido: ${insert}`)
  table[insert] = { wall, index: vao.indice }
}

// Escrito já no formato do Biome (aspas simples, um par por linha), para o --check comparar bytes.
const rows = Object.entries(table)
  .map(([insert, { wall, index }]) => `  '${insert}': { wall: '${wall}', index: ${index} },`)
  .join(String.fromCharCode(10))
const text = `// Gerado por scripts/morada/encaixes.ts a partir da arte (vao de cada janela e porta). Não edite.
import type { MoradaInsertOpening } from './types'

export const MORADA_INSERT_OPENINGS: Readonly<Record<string, MoradaInsertOpening>> = {
${rows}
}
`

if (process.argv.includes('--check')) {
  const current = await readFile(target, 'utf8').catch(() => '')
  if (current.replaceAll('\r\n', '\n') !== text)
    throw new Error('encaixes.generated.ts desatualizado: rode scripts/morada/encaixes.ts')
  console.log(`Encaixes conferidos: ${Object.keys(table).length} janelas e portas.`)
} else {
  await writeFile(target, text)
  console.log(`Encaixes gravados: ${Object.keys(table).length} janelas e portas.`)
}
