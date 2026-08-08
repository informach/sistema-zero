/**
 * Gera `src/examples/__gen_serverExamplesIndex.ts` a partir dos catálogos de
 * exemplos (rode de dentro de packages/studio: `bun run gen:server-examples`).
 * O servidor importa SÓ o gerado — nunca as IRs (~3.4MB).
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildServerExamplesIndex } from '../src/examples/serverExamplesBuilder'

const entries = buildServerExamplesIndex()
const target = join(import.meta.dir, '..', 'src', 'examples', '__gen_serverExamplesIndex.ts')
const body = [
  '// GERADO por scripts/gen-server-examples.ts — NÃO EDITE À MÃO.',
  '// Mudou um catálogo de exemplos? Rode `bun run gen:server-examples`',
  '// (o drift test em serverExamples.test.ts compara com os catálogos reais).',
  "import type { ServerExampleIndexEntry } from './serverExamples'",
  '',
  `export const SERVER_EXAMPLES_INDEX: readonly ServerExampleIndexEntry[] = ${JSON.stringify(entries, null, 2)}`,
  '',
].join('\n')
writeFileSync(target, body)
console.log(`gerado: ${entries.length} exemplos → src/examples/__gen_serverExamplesIndex.ts`)
