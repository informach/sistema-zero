/** Requalify stale visual receipts against an explicit local runtime; never activate a release. */
import assert from 'node:assert/strict'
import { access, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { StudioRuntimeReleaseSchema } from '@sistemazero/core/studio/runtime-catalog'
import { PGZERO_GAMES } from '../../src/examples/python/pgzeroGames.manifest'
import { RAYLIB_GAMES } from '../../src/examples/python/raylibGames.manifest'
import { VISUAL_REFERENCE_GAMES } from '../../src/examples/python/visualReferenceGames.manifest'
import { orderPythonAuthoringCodecs } from '../../src/python/blocks/authoring'
import type { PythonBlockCodec } from '../../src/python/blocks/contract'
import { PYTHON_PGZERO_CODECS } from '../../src/python/extensions/pgzero/catalog'
import { PYTHON_RAYLIB_2D_CODECS } from '../../src/python/extensions/raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../../src/python/extensions/raylib3d/catalog'
import { PYTHON_TURTLE_CODECS } from '../../src/python/extensions/turtle/catalog'
import { writeGeneratedSource } from '../writeGeneratedSource'
import {
  loadVisualExampleAuthoring,
  qualifyPythonVisualExample,
  startVisualExampleAnalysis,
  type VisualExampleEdit,
} from './visual-example-qualification'

const root = resolve(import.meta.dirname, '../../../..')
const studio = resolve(root, 'packages/studio')
const args = process.argv.slice(2)
const option = (name: string) => {
  const at = args.indexOf(`--${name}`)
  const value = at < 0 ? undefined : args[at + 1]
  assert(value && !value.startsWith('--'), `Missing --${name}`)
  return value
}
const release = StudioRuntimeReleaseSchema.parse(
  JSON.parse(await readFile(option('runtime-release'), 'utf8')),
)
const distribution = option('distribution')
const distributionSha256 = option('distribution-sha256')
const nodeExecutable = option('node')
const selected = args.includes('--game') ? option('game') : undefined
interface GalleryGame {
  key: string
  receipt: string
  extension?: string
}
interface GalleryFamily {
  games: readonly GalleryGame[]
  directory: string
  evidence: string
  manifest: string
  extension(game: GalleryGame): string
  codecs(game: GalleryGame): readonly PythonBlockCodec[]
}
const families: GalleryFamily[] = [
  {
    games: VISUAL_REFERENCE_GAMES,
    directory: '',
    evidence: '2026-10-22-python-reference-games-visual-evidence',
    manifest: 'visualReferenceGames.manifest.ts',
    extension: () => 'python-turtle',
    codecs: () => PYTHON_TURTLE_CODECS,
  },
  {
    games: PGZERO_GAMES,
    directory: 'pgzero',
    evidence: '2026-10-24-python-pgzero-games-evidence',
    manifest: 'pgzeroGames.manifest.ts',
    extension: () => 'python-pgzero',
    codecs: () => PYTHON_PGZERO_CODECS,
  },
  {
    games: RAYLIB_GAMES,
    directory: 'raylib',
    evidence: '2026-10-24-python-raylib-games-evidence',
    manifest: 'raylibGames.manifest.ts',
    extension: (game) => (game.extension === '3d' ? 'python-raylib-3d' : 'python-raylib-2d'),
    codecs: (game) => (game.extension === '3d' ? PYTHON_RAYLIB_3D_CODECS : PYTHON_RAYLIB_2D_CODECS),
  },
]
let analysis: Awaited<ReturnType<typeof startVisualExampleAnalysis>> | undefined
let count = 0
const updates: {
  manifest: string
  before: string
  after: string
  path: string
  receipt: unknown
}[] = []
try {
  for (const family of families)
    for (const game of family.games) {
      if (selected && game.key !== selected) continue
      // Keep batches below the analysis child's existing 120-second lifetime.
      if (count % 3 === 0) {
        await analysis?.close()
        analysis = await startVisualExampleAnalysis({
          nodeExecutable,
          distribution,
          distributionSha256,
        })
      }
      const evidence = resolve(root, 'docs/continuity', family.evidence)
      const previous = JSON.parse(await readFile(resolve(evidence, game.receipt), 'utf8')) as {
        edits: VisualExampleEdit[]
      }
      const codecs = orderPythonAuthoringCodecs(
        family.codecs(game),
        release.manifest.python?.features ?? [],
      )
      const authoring = await loadVisualExampleAuthoring({
        release,
        extension: family.extension(game),
        approvedBlockIds: codecs.map(({ id }) => id),
      })
      const path = resolve(studio, 'src/examples/python', family.directory, game.key, 'main.py')
      const source = await readFile(path, 'utf8')
      const receipt = await qualifyPythonVisualExample({
        source,
        path,
        analysis: analysis!,
        authoring,
        edits: previous.edits,
      })
      const match = /^(.*)-r(\d+)\.json\.snapshot$/.exec(game.receipt)
      assert(match, `Unrecognized receipt path: ${game.receipt}`)
      let number = Number(match[2]) + 1
      let next: string
      for (;;) {
        next = `${match[1]}-r${number}.json.snapshot`
        try {
          await access(resolve(evidence, next))
          number++
        } catch (error) {
          if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
            throw error
          break
        }
      }
      updates.push({
        manifest: resolve(studio, 'src/examples/python', family.manifest),
        before: game.receipt,
        after: next,
        path: resolve(evidence, next),
        receipt,
      })
      console.log(
        `${game.key}: ${receipt.blockCount} blocks, ${receipt.edits.length} causal edits; complete Blockly and CPython roundtrip`,
      )
      count++
    }
} finally {
  await analysis?.close()
}
assert(updates.length > 0, 'No matching games')
// Publish the new evidence only after the complete requested batch has qualified.
for (const update of updates)
  await writeFile(update.path, `${JSON.stringify(update.receipt, null, 2)}\n`, { flag: 'wx' })
for (const manifest of new Set(updates.map(({ manifest }) => manifest))) {
  let source = await readFile(manifest, 'utf8')
  for (const update of updates.filter((item) => item.manifest === manifest)) {
    assert.equal(
      source.split(`'${update.before}'`).length,
      2,
      'Receipt must have one manifest owner',
    )
    source = source.replace(`'${update.before}'`, `'${update.after}'`)
  }
  writeGeneratedSource(manifest, source)
}
console.log(`Qualified ${updates.length} games. Regenerate the gallery block metadata next.`)
