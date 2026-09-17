#!/usr/bin/env bun
/**
 * `bun run tokens:gen` — gera `src/styles/palettes/community.css` a partir do registro.
 *
 * ⚠️ Ele AUDITA o contraste antes de escrever e sai com código 1 nomeando a dupla que reprovou:
 * uma paleta ilegível não chega ao disco, quanto mais à criança. É o portão que uma cor nova
 * atravessa, e é por isso que o conjunto pode ser curado sem ninguém conferir de olho.
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { PALETTES } from '@sistemazero/core/palette'
import { auditConsole, auditPalette, describeFailure } from '../src/tokens/contrast'
import { toConsoleCss, toCss } from '../src/tokens/emit'
import { PALETTE_RECIPES } from '../src/tokens/palettes'

const DESTINO = join(import.meta.dir, '../src/styles/palettes/community.css')
const DESTINO_CONSOLE = join(import.meta.dir, '../src/styles/console.css')

const semReceita = PALETTES.filter((id) => !PALETTE_RECIPES.some((r) => r.id === id))
const semVocabulario = PALETTE_RECIPES.filter(
  (r) => !(PALETTES as readonly string[]).includes(r.id),
).map((r) => r.id)
if (semReceita.length || semVocabulario.length) {
  if (semReceita.length)
    console.error(`✗ Sem receita de cor em palettes.ts: ${semReceita.join(', ')}`)
  if (semVocabulario.length) console.error(`✗ Sem id no core/palette: ${semVocabulario.join(', ')}`)
  process.exit(1)
}

const falhas = PALETTES.flatMap(auditPalette)
if (falhas.length) {
  console.error('✗ Contraste reprovado — a paleta NÃO foi gerada:')
  for (const falha of falhas) console.error(`  ${describeFailure(falha)}`)
  process.exit(1)
}

const falhasConsole = auditConsole()
if (falhasConsole.length) {
  console.error('✗ Contraste do CONSOLE reprovado — nada foi gerado:')
  for (const falha of falhasConsole) console.error(`  ${describeFailure(falha)}`)
  process.exit(1)
}

await mkdir(dirname(DESTINO), { recursive: true })
await Bun.write(DESTINO, toCss())
await Bun.write(DESTINO_CONSOLE, toConsoleCss())
console.log(`✓ ${PALETTES.length} paletas + o chassi console gerados`)
