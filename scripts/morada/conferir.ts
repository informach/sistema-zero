import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { MORADA_CATALOG } from '../../packages/core/src/morada/catalog.generated'

const root = resolve(import.meta.dirname, '../..')
const source = resolve(process.env.ARTES_3D_DIR ?? join(root, '../artes-3d'))
const output = resolve(process.env.MORADA_OUTPUT_DIR ?? join(root, 'output/morada-assets'))
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim()
if (commit !== MORADA_CATALOG.source.commit)
  throw new Error('A arte mudou: rode morada:migrar para conferir as diferenças.')
for (const file of MORADA_CATALOG.files) {
  const bytes = await readFile(join(output, 'morada', file))
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 24)
  if (!file.includes(`/${hash}.`)) throw new Error(`Arquivo alterado ou corrompido: ${file}`)
}
console.log(
  `Morada conferida: ${Object.keys(MORADA_CATALOG.pieces).length} peças, ${MORADA_CATALOG.files.length} arquivos privados íntegros.`,
)
