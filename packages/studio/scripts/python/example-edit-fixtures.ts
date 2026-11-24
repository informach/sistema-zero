/**
 * As edições de qualificação de cada exemplo Python em blocos (Turtle, Pygame Zero, Raylib 2D e
 * 3D), tiradas do recibo ATUAL de cada jogo, como fixtures versionadas:
 *
 *     bun scripts/python/example-edit-fixtures.ts           # grava
 *     bun scripts/python/example-edit-fixtures.ts --check   # confere
 *
 * A fixture é a entrada da requalificação (rótulo, caminho do bloco, campo, valor antes e
 * depois), sem as assinaturas do resultado que o recibo guarda. Ela existe para a conversão dos
 * exemplos às áreas do projeto (22/11/2026): os caminhos apontam para a posição da linha de topo,
 * que muda quando o exemplo é organizado, então são remapeados aqui, por assinatura da linha,
 * antes de requalificar.
 */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PGZERO_GAMES } from '../../src/examples/python/pgzeroGames.manifest'
import { RAYLIB_GAMES } from '../../src/examples/python/raylibGames.manifest'
import { VISUAL_REFERENCE_GAMES } from '../../src/examples/python/visualReferenceGames.manifest'
import type { VisualExampleEdit } from './visual-example-qualification'

const root = resolve(import.meta.dirname, '../../../..')
const fixtures = resolve(import.meta.dirname, 'fixtures')
const check = process.argv.includes('--check')

export const EXAMPLE_EDIT_FAMILIES = [
  {
    games: VISUAL_REFERENCE_GAMES,
    evidence: '2026-10-22-python-reference-games-visual-evidence',
    directory: 'visual-reference-games',
  },
  {
    games: PGZERO_GAMES,
    evidence: '2026-10-24-python-pgzero-games-evidence',
    directory: 'pgzero-games',
  },
  {
    games: RAYLIB_GAMES,
    evidence: '2026-10-24-python-raylib-games-evidence',
    directory: 'raylib-games',
  },
] as const

/** Só a entrada da edição (o recibo também guarda as assinaturas do resultado). */
export function exampleEditInput(edit: VisualExampleEdit): VisualExampleEdit {
  return {
    label: edit.label,
    path: edit.path,
    codecId: edit.codecId,
    field: edit.field,
    before: edit.before,
    after: edit.after,
  }
}

if (import.meta.main) {
  const stale: string[] = []
  let count = 0
  for (const family of EXAMPLE_EDIT_FAMILIES)
    for (const game of family.games) {
      const receipt = JSON.parse(
        await readFile(resolve(root, 'docs/continuity', family.evidence, game.receipt), 'utf8'),
      ) as { edits?: VisualExampleEdit[] }
      assert.ok(
        Array.isArray(receipt.edits) && receipt.edits.length,
        `${game.key}: recibo sem edições`,
      )
      const text = `${JSON.stringify(receipt.edits.map(exampleEditInput), null, 2)}\n`
      const path = resolve(fixtures, family.directory, `${game.key}.edits.json`)
      const current = await readFile(path, 'utf8').catch(() => undefined)
      count++
      if (current === text) continue
      if (check) stale.push(`${family.directory}/${game.key}`)
      else await writeFile(path, text)
    }
  if (check && stale.length) {
    console.error(`Fixtures de edição desatualizadas (${stale.length}):\n${stale.join('\n')}`)
    process.exit(1)
  }
  console.log(`${count} fixtures de edição ${check ? 'conferidas' : 'gravadas'}.`)
}
