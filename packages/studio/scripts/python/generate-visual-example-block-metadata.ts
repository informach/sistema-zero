import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { canonicalJson } from '@sistemazero/core/creations'
import {
  VISUAL_REFERENCE_GAMES,
  type VisualReferenceGameKey,
} from '../../src/examples/python/visualReferenceGames.manifest'
import { orderPythonAuthoringCodecs } from '../../src/python/blocks/authoring'
import type { PythonBlockCodec } from '../../src/python/blocks/contract'
import { PYTHON_PGZERO_CODECS } from '../../src/python/extensions/pgzero/catalog'
import { PYTHON_RAYLIB_2D_CODECS } from '../../src/python/extensions/raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../../src/python/extensions/raylib3d/catalog'
import { PYTHON_TURTLE_CODECS } from '../../src/python/extensions/turtle/catalog'
import { PGZERO_EXTENSION } from '../../src/runtime/python/pgzero/contract'
import { RAYLIB_2D_EXTENSION, RAYLIB_3D_EXTENSION } from '../../src/runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../../src/runtime/python/turtle/contract'

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex')
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// The catalog of each extension the authoring loader knows (a null prototype: no inherited names).
const EXTENSION_CODECS: Record<string, readonly PythonBlockCodec[]> = Object.assign(
  Object.create(null),
  {
    [TURTLE_EXTENSION.id]: PYTHON_TURTLE_CODECS,
    [PGZERO_EXTENSION.id]: PYTHON_PGZERO_CODECS,
    [RAYLIB_2D_EXTENSION.id]: PYTHON_RAYLIB_2D_CODECS,
    [RAYLIB_3D_EXTENSION.id]: PYTHON_RAYLIB_3D_CODECS,
  },
)

/**
 * The codec order the current catalog gives the extension and runtime features a receipt was
 * qualified with. A receipt from an older catalog (a block added, removed or moved) differs.
 */
export function currentCodecOrderSha256(receipt: Record<string, unknown>) {
  const { extension, authoringRuntimeFeatures: features } = receipt
  assert.ok(
    Array.isArray(features) && features.every((feature) => typeof feature === 'string'),
    'Receipt must name the runtime features it was qualified with',
  )
  assert.ok(
    extension === undefined || (typeof extension === 'string' && extension in EXTENSION_CODECS),
    'Receipt names an unknown extension',
  )
  const codecs = orderPythonAuthoringCodecs(
    extension === undefined ? undefined : EXTENSION_CODECS[extension],
    features,
  )
  return sha256(canonicalJson(codecs.map(({ id }) => id)))
}

export const decodeVisualExampleSource = (bytes: Uint8Array) =>
  new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)

/** Consumes authoring evidence only; neither generates nor approves runtime capabilities. */
export function readVisualExampleBlockMetadata(receipt: unknown, source: string) {
  assert.ok(record(receipt), 'Invalid visual qualification receipt')
  assert.equal(receipt.kind, 'python-visual-authoring', 'Wrong qualification kind')
  assert.equal(
    receipt.authoringLoader,
    'loadPythonAuthoring',
    'Receipt must use the real authoring loader',
  )
  assert.equal(receipt.opaqueCount, 0, 'Opaque source cannot qualify block metadata')
  assert.equal(receipt.fullWorkspaceRoundtrip, true, 'Full workspace roundtrip is required')
  assert.equal(receipt.canonicalRenderReanalysis, true, 'Canonical rendering must be reanalyzed')
  assert.equal(
    receipt.codecOrderSha256,
    currentCodecOrderSha256(receipt),
    'Qualification block catalog differs from the current one: qualify the example again',
  )
  const sourceSha256 = sha256(source)
  assert.equal(
    receipt.sourceSha256,
    sourceSha256,
    'Qualification source differs from current main.py',
  )
  assert.ok(
    Array.isArray(receipt.referencedBlocks) &&
      receipt.referencedBlocks.length > 0 &&
      receipt.referencedBlocks.length <= 10_000,
    'Invalid referenced block list',
  )
  const ids = new Set<string>()
  let count = 0
  for (const block of receipt.referencedBlocks) {
    assert.ok(
      record(block) && typeof block.id === 'string' && /^sz_py_[A-Za-z0-9_]{1,120}$/.test(block.id),
      'Invalid Python block identity',
    )
    assert.ok(!ids.has(block.id), 'Duplicate referenced block')
    assert.ok(
      typeof block.count === 'number' &&
        Number.isSafeInteger(block.count) &&
        block.count > 0 &&
        block.count <= 20_000,
      'Invalid block count',
    )
    ids.add(block.id)
    count += block.count
  }
  assert.ok(count <= 20_000 && count === receipt.blockCount, 'Incomplete block inventory')
  return { sourceSha256, blockIds: [...ids].sort() }
}

export function visualExampleBlockMetadataSource(
  input: Record<VisualReferenceGameKey, ReturnType<typeof readVisualExampleBlockMetadata>>,
) {
  return (
    '// Gerado por scripts/python/generate-visual-example-block-metadata.ts. Não edite.\n' +
    '// Evidência de autoria visual; disponibilidade e autorização continuam pertencendo ao host.\n' +
    `export const VISUAL_REFERENCE_GAME_BLOCKS = ${JSON.stringify(input, null, 2)} as const\n`
  )
}

if (import.meta.main) {
  const studio = resolve(import.meta.dirname, '../..')
  const root = resolve(studio, '../..')
  const args = process.argv.slice(2)
  // --receipt <game>=<path> replaces the versioned receipt of one game.
  const overrides = new Map<string, string>()
  args.forEach((value, index) => {
    if (value !== '--receipt') return
    const argument = args[index + 1] ?? ''
    // Only the first '=' separates the game; a path may contain '=' itself.
    const separator = argument.indexOf('=')
    const game = argument.slice(0, separator)
    const path = argument.slice(separator + 1)
    assert.ok(!argument.startsWith('--') && separator > 0 && path, 'Use --receipt <jogo>=<caminho>')
    assert.ok(!overrides.has(game), `Recibo repetido para ${game}`)
    overrides.set(game, resolve(root, path))
  })
  for (const game of overrides.keys())
    assert.ok(
      VISUAL_REFERENCE_GAMES.some(({ key }) => key === game),
      `Jogo desconhecido: ${game}`,
    )
  const evidence = 'docs/continuity/2026-10-22-python-reference-games-visual-evidence'
  const metadata = {} as Record<
    VisualReferenceGameKey,
    ReturnType<typeof readVisualExampleBlockMetadata>
  >
  for (const game of VISUAL_REFERENCE_GAMES) {
    const path = overrides.get(game.key) ?? resolve(root, evidence, game.receipt)
    const receipt: unknown = JSON.parse(await readFile(path, 'utf8'))
    const source = decodeVisualExampleSource(
      await readFile(resolve(studio, `src/examples/python/${game.key}/main.py`)),
    )
    metadata[game.key] = readVisualExampleBlockMetadata(receipt, source)
  }
  const raw = visualExampleBlockMetadataSource(metadata)
  const outputName = 'src/examples/python/visualReferenceGames.blocks.generated.ts'
  const formatter = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'x',
      '--no-install',
      'biome',
      'format',
      `--stdin-file-path=${outputName}`,
    ],
    { cwd: studio, stdin: new Blob([raw]), stdout: 'pipe', stderr: 'pipe' },
  )
  const [code, formatted, errors] = await Promise.all([
    formatter.exited,
    new Response(formatter.stdout).text(),
    new Response(formatter.stderr).text(),
  ])
  assert.equal(code, 0, `Failed to format block metadata: ${errors}`)
  const output = resolve(studio, outputName)
  if (args.includes('--check')) {
    const actual = await readFile(output, 'utf8')
    assert.equal(actual.replaceAll('\r\n', '\n'), formatted, 'Visual block metadata is stale')
    console.log(`Conferido ${outputName}`)
  } else {
    await writeFile(output, formatted, 'utf8')
    console.log(`Gerado ${outputName}`)
  }
}
