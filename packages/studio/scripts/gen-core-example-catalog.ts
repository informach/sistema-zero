/**
 * Gera o catálogo leve dos exemplos clássicos. A galeria importa este arquivo
 * e só baixa as IRs de `core.ts` quando a pessoa abre um card.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CORE_EXAMPLES } from '../src/examples/core'

const summaries = CORE_EXAMPLES.map(({ name, description, experience }) => ({
  name,
  description,
  experience,
}))
const target = join(import.meta.dir, '..', 'src', 'examples', '__gen_coreExampleCatalog.ts')
const body = [
  '// GERADO por scripts/gen-core-example-catalog.ts — NÃO EDITE À MÃO.',
  '// Mudou um exemplo clássico? Rode `bun run gen:core-example-catalog`.',
  "import type { CoreExampleSummary } from './coreCatalog'",
  '',
  `export const CORE_EXAMPLE_SUMMARIES: readonly CoreExampleSummary[] = ${JSON.stringify(summaries, null, 2)}`,
  '',
].join('\n')

writeFileSync(target, body)
const formatted = Bun.spawnSync({
  cmd: [process.execPath, 'x', 'biome', 'format', '--write', target],
  cwd: join(import.meta.dir, '..'),
  stdout: 'inherit',
  stderr: 'inherit',
})
if (formatted.exitCode !== 0) {
  throw new Error(`Biome não conseguiu formatar ${target} (código ${formatted.exitCode})`)
}
console.log(`gerado: ${summaries.length} resumos → src/examples/__gen_coreExampleCatalog.ts`)
